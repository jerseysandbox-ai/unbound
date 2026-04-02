/**
 * POST /api/generate-quiz
 *
 * Generates a quiz from a lesson plan using Claude. Stores result in KV.
 * Auth required, Turnstile verified.
 */

export const maxDuration = 60;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}

type QuestionType = "multiple_choice" | "true_false" | "fill_blank" | "matching" | "extended";

interface RequestBody {
  planId: string;
  subject: string;
  questionCount: number;
  difficulty: string;
  questionTypes: QuestionType[];
  turnstileToken: string;
}

interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string | string[];
  matchPairs?: { left: string; right: string }[];
  modelAnswer?: string;
}

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { planId, subject, questionCount, difficulty, questionTypes, turnstileToken } = body;

    // Validate inputs
    if (!planId || !turnstileToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (![5, 10, 15].includes(questionCount)) {
      return NextResponse.json({ error: "Invalid question count" }, { status: 400 });
    }
    if (!["Easy", "Medium", "Challenge"].includes(difficulty)) {
      return NextResponse.json({ error: "Invalid difficulty" }, { status: 400 });
    }
    if (!questionTypes || questionTypes.length === 0) {
      return NextResponse.json({ error: "Select at least one question type" }, { status: 400 });
    }

    // Verify Turnstile
    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return NextResponse.json({ error: "Security check failed. Please refresh and try again." }, { status: 403 });
    }

    // Load plan content - try Supabase first, then KV
    let planContent: string | null = null;

    const adminSupabase = createAdminClient();
    const { data: planRow } = await adminSupabase
      .from("plan_results")
      .select("content")
      .eq("id", planId)
      .eq("user_id", user.id)
      .single();

    if (planRow?.content) {
      planContent = planRow.content;
    } else {
      // Try KV fallback
      const kvData = await kv.get<{ plan?: string }>(`plan:${planId}`);
      if (kvData?.plan) {
        planContent = kvData.plan;
      }
    }

    // Also try the stored plan format (unbound_plans table)
    if (!planContent) {
      const { data: storedPlan } = await adminSupabase
        .from("unbound_plans")
        .select("teacher_plan")
        .eq("kv_session_id", planId)
        .eq("user_id", user.id)
        .single();

      if (storedPlan?.teacher_plan) {
        planContent = storedPlan.teacher_plan;
      }
    }

    if (!planContent) {
      return NextResponse.json({ error: "Plan not found. It may have expired." }, { status: 404 });
    }

    // Cap plan content to avoid token blow-up
    const trimmedPlan = planContent.slice(0, 8000);

    const typeLabels: Record<QuestionType, string> = {
      multiple_choice: "Multiple Choice",
      true_false: "True/False",
      fill_blank: "Fill in the Blank",
      matching: "Matching",
      extended: "Extended Response",
    };
    const typeList = questionTypes.map((t) => typeLabels[t]).join(", ");

    const prompt = `Based on this lesson plan content, generate a quiz with exactly ${questionCount} questions at ${difficulty} level${subject ? ` on the subject of ${subject}` : ""}.

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "A"
    },
    {
      "id": "q2",
      "type": "true_false",
      "question": "...",
      "answer": "True"
    },
    {
      "id": "q3",
      "type": "fill_blank",
      "question": "The ___ is ...",
      "answer": "word"
    },
    {
      "id": "q4",
      "type": "matching",
      "question": "Match each term to its definition",
      "matchPairs": [{"left": "term", "right": "definition"}],
      "answer": ["term1:def1", "term2:def2"]
    },
    {
      "id": "q5",
      "type": "extended",
      "question": "Explain ...",
      "answer": "",
      "modelAnswer": "A complete answer would include..."
    }
  ]
}

Include only these question types: ${typeList}. Distribute them evenly.
Lesson plan content:
${trimmedPlan}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Failed to generate quiz content" }, { status: 500 });
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = textBlock.text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    let parsed: { questions: QuizQuestion[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json({ error: "Failed to parse quiz. Please try again." }, { status: 500 });
    }

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ error: "Invalid quiz format. Please try again." }, { status: 500 });
    }

    // Store in KV with 24h TTL
    const quizId = `quiz_${planId}_${Date.now()}`;
    await kv.set(quizId, { questions: parsed.questions }, { ex: 86400 });

    return NextResponse.json({ quizId, questions: parsed.questions });
  } catch (err) {
    console.error("[generate-quiz] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
