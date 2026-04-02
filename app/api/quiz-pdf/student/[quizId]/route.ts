/**
 * GET /api/quiz-pdf/student/[quizId]
 *
 * Returns an HTML page with the student version of the quiz (questions only, no answers).
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
  matchPairs?: MatchPair[];
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

    const quizData = await kv.get<{ questions: QuizQuestion[]; userId?: string }>(quizId);
    if (!quizData || !quizData.questions) {
      return NextResponse.json({ error: "Quiz not found or expired" }, { status: 404 });
    }

    // IDOR fix: verify ownership
    if (quizData.userId && quizData.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let questionsHtml = "";
    quizData.questions.forEach((q, i) => {
      questionsHtml += `<div class="question"><p class="q-num">${i + 1}. ${escapeHtml(q.question)}</p>`;

      if (q.type === "multiple_choice" && q.options) {
        questionsHtml += `<div class="options">`;
        q.options.forEach((opt) => {
          questionsHtml += `<div class="option">&#9634; ${escapeHtml(opt)}</div>`;
        });
        questionsHtml += `</div>`;
      } else if (q.type === "true_false") {
        questionsHtml += `<div class="options"><div class="option">&#9634; True</div><div class="option">&#9634; False</div></div>`;
      } else if (q.type === "fill_blank") {
        questionsHtml += `<div class="blank-line">Answer: ___________________________________</div>`;
      } else if (q.type === "matching" && q.matchPairs) {
        questionsHtml += `<table class="match-table"><tr><th>Term</th><th>Match</th></tr>`;
        q.matchPairs.forEach((pair) => {
          questionsHtml += `<tr><td>${escapeHtml(pair.left)}</td><td>______________________</td></tr>`;
        });
        questionsHtml += `</table><p class="match-bank"><strong>Answer bank:</strong> ${q.matchPairs.map((p) => escapeHtml(p.right)).join(" &nbsp;|&nbsp; ")}</p>`;
      } else if (q.type === "extended") {
        questionsHtml += `<div class="extended-lines">${"<br/>".repeat(6)}</div>`;
      }

      questionsHtml += `</div>`;
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Quiz - Student Copy</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #2d2d2d; line-height: 1.6; }
    h1 { color: #5b8f8a; border-bottom: 2px solid #5b8f8a; padding-bottom: 8px; font-size: 1.4em; }
    .name-line { margin-bottom: 24px; font-size: 0.95em; }
    .question { margin-bottom: 20px; page-break-inside: avoid; }
    .q-num { font-weight: bold; margin-bottom: 6px; }
    .options { margin-left: 20px; }
    .option { margin: 4px 0; }
    .blank-line { margin: 8px 0 0 20px; }
    .match-table { margin: 8px 0 0 20px; border-collapse: collapse; width: 90%; }
    .match-table th, .match-table td { border: 1px solid #ccc; padding: 6px 12px; text-align: left; }
    .match-bank { margin: 8px 0 0 20px; font-size: 0.9em; color: #555; }
    .extended-lines { margin: 8px 0 0 20px; border-bottom: 1px solid #ccc; line-height: 2.2; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Quiz</h1>
  <p class="name-line">Name: ___________________________ &nbsp;&nbsp; Date: _______________</p>
  ${questionsHtml}
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="quiz-student-${quizId}.html"`,
      },
    });
  } catch (err) {
    console.error("[quiz-pdf/student] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
