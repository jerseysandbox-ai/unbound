/**
 * GET /api/quiz-pdf/answer-key/[quizId]
 *
 * Returns an HTML page with the answer key version of the quiz.
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { kv } from "@vercel/kv";

interface MatchPair {
  left: string;
  right: string;
}

interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  answer: string | string[];
  matchPairs?: MatchPair[];
  modelAnswer?: string;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  const { quizId } = await params;

  if (!quizId) {
    return NextResponse.json({ error: "Missing quiz ID" }, { status: 400 });
  }

  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizData = await kv.get<{ questions: QuizQuestion[] }>(quizId);
    if (!quizData || !quizData.questions) {
      return NextResponse.json({ error: "Quiz not found or expired" }, { status: 404 });
    }

    let questionsHtml = "";
    quizData.questions.forEach((q, i) => {
      questionsHtml += `<div class="question"><p class="q-num">${i + 1}. ${escapeHtml(q.question)}</p>`;

      if (q.type === "multiple_choice" && q.options) {
        questionsHtml += `<div class="options">`;
        q.options.forEach((opt) => {
          const letter = opt.charAt(0);
          const isAnswer = letter === (Array.isArray(q.answer) ? q.answer[0] : q.answer);
          questionsHtml += `<div class="option${isAnswer ? " correct" : ""}">${isAnswer ? "&#10003;" : "&#9634;"} ${escapeHtml(opt)}</div>`;
        });
        questionsHtml += `</div>`;
      } else if (q.type === "true_false") {
        const ans = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        questionsHtml += `<div class="options">`;
        questionsHtml += `<div class="option${ans === "True" ? " correct" : ""}">${ans === "True" ? "&#10003;" : "&#9634;"} True</div>`;
        questionsHtml += `<div class="option${ans === "False" ? " correct" : ""}">${ans === "False" ? "&#10003;" : "&#9634;"} False</div>`;
        questionsHtml += `</div>`;
      } else if (q.type === "fill_blank") {
        const ans = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        questionsHtml += `<div class="answer-box">Answer: <strong>${escapeHtml(ans)}</strong></div>`;
      } else if (q.type === "matching" && q.matchPairs) {
        questionsHtml += `<table class="match-table"><tr><th>Term</th><th>Answer</th></tr>`;
        q.matchPairs.forEach((pair) => {
          questionsHtml += `<tr><td>${escapeHtml(pair.left)}</td><td class="correct">${escapeHtml(pair.right)}</td></tr>`;
        });
        questionsHtml += `</table>`;
      } else if (q.type === "extended") {
        questionsHtml += `<div class="model-answer"><strong>Model answer:</strong> ${escapeHtml(q.modelAnswer ?? "")}</div>`;
      }

      questionsHtml += `</div>`;
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Quiz - Answer Key</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #2d2d2d; line-height: 1.6; }
    h1 { color: #5b8f8a; border-bottom: 2px solid #5b8f8a; padding-bottom: 8px; font-size: 1.4em; }
    .badge { display: inline-block; background: #e8f4f3; color: #3d6e69; font-size: 0.8em; padding: 2px 10px; border-radius: 8px; margin-left: 8px; }
    .question { margin-bottom: 20px; page-break-inside: avoid; }
    .q-num { font-weight: bold; margin-bottom: 6px; }
    .options { margin-left: 20px; }
    .option { margin: 4px 0; }
    .option.correct { color: #2e7d32; font-weight: bold; }
    .answer-box { margin: 8px 0 0 20px; color: #2e7d32; }
    .model-answer { margin: 8px 0 0 20px; background: #f0faf0; padding: 10px; border-radius: 8px; font-size: 0.95em; }
    .match-table { margin: 8px 0 0 20px; border-collapse: collapse; width: 90%; }
    .match-table th, .match-table td { border: 1px solid #ccc; padding: 6px 12px; text-align: left; }
    .match-table .correct { color: #2e7d32; font-weight: bold; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Quiz <span class="badge">Answer Key</span></h1>
  ${questionsHtml}
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="quiz-answer-key-${quizId}.html"`,
      },
    });
  } catch (err) {
    console.error("[quiz-pdf/answer-key] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
