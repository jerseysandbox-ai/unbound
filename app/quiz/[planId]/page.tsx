"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";

const TurnstileWidget = dynamic(() => import("@/components/TurnstileWidget"), {
  ssr: false,
});

// ── Types ────────────────────────────────────────────────────────────────────

type QuestionType = "multiple_choice" | "true_false" | "fill_blank" | "matching" | "extended";

interface MatchPair {
  left: string;
  right: string;
}

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  answer: string | string[];
  matchPairs?: MatchPair[];
  modelAnswer?: string;
}

interface QuizData {
  quizId: string;
  questions: Question[];
}

// ── Config form types ────────────────────────────────────────────────────────

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "matching", label: "Matching" },
  { value: "extended", label: "Extended Response" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { planId } = useParams<{ planId: string }>();

  // Config form state
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Challenge">("Medium");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([
    "multiple_choice", "true_false", "fill_blank", "matching", "extended",
  ]);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Quiz state
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Answers state
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"take" | "print">("take");

  function toggleQuestionType(qt: QuestionType) {
    setQuestionTypes((prev) =>
      prev.includes(qt) ? prev.filter((t) => t !== qt) : [...prev, qt]
    );
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!turnstileToken) {
      setError("Please complete the security check.");
      return;
    }
    if (questionTypes.length === 0) {
      setError("Select at least one question type.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          subject: subject.trim(),
          questionCount,
          difficulty,
          questionTypes,
          turnstileToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate quiz");
      }

      const data: QuizData = await res.json();
      setQuiz(data);
      setAnswers({});
      setSubmitted(false);
      setScore(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleSubmitQuiz() {
    if (!quiz) return;

    let correct = 0;
    let total = 0;

    for (const q of quiz.questions) {
      if (q.type === "extended") continue; // skip scoring
      total++;

      const userAnswer = answers[q.id];
      if (!userAnswer) continue;

      if (q.type === "matching") {
        // Compare arrays
        const expected = Array.isArray(q.answer) ? q.answer : [];
        const given = Array.isArray(userAnswer) ? userAnswer : [];
        if (expected.length === given.length && expected.every((a, i) => a.toLowerCase().trim() === (given[i] ?? "").toLowerCase().trim())) {
          correct++;
        }
      } else {
        // String comparison case-insensitive
        const expected = Array.isArray(q.answer) ? q.answer[0] : q.answer;
        const given = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
        if (expected.toLowerCase().trim() === (given ?? "").toLowerCase().trim()) {
          correct++;
        }
      }
    }

    setScore({ correct, total });
    setSubmitted(true);
  }

  function isCorrect(q: Question): boolean | null {
    if (q.type === "extended") return null;
    const userAnswer = answers[q.id];
    if (!userAnswer) return false;

    if (q.type === "matching") {
      const expected = Array.isArray(q.answer) ? q.answer : [];
      const given = Array.isArray(userAnswer) ? userAnswer : [];
      return expected.length === given.length && expected.every((a, i) => a.toLowerCase().trim() === (given[i] ?? "").toLowerCase().trim());
    }

    const expected = Array.isArray(q.answer) ? q.answer[0] : q.answer;
    const given = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    return expected.toLowerCase().trim() === (given ?? "").toLowerCase().trim();
  }

  // ── Config form (phase 1) ─────────────────────────────────────────────────

  if (!quiz) {
    return (
      <main className="min-h-screen bg-[#faf9f6]">
        <div className="bg-[#5b8f8a] text-white px-4 py-5">
          <div className="max-w-2xl mx-auto">
            <a href="/" className="font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">Unbound</a>
            <h1 className="text-lg font-semibold mt-1 text-white/90">Quiz Generator</h1>
          </div>
        </div>

        <div className="max-w-xl mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block w-8 h-8 border-3 border-[#5b8f8a] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[#5b8f8a] font-medium text-lg">Building your quiz...</p>
              <p className="text-[#8a8580] text-sm mt-1">This usually takes 15-30 seconds</p>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="bg-white rounded-2xl shadow-sm border border-[#e8e4e0] p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Math, Science, Spelling"
                  className="w-full border border-[#e0dbd5] rounded-lg px-3 py-2.5 text-[#2d2d2d] bg-[#faf9f6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] text-sm"
                />
              </div>

              {/* Number of questions */}
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">Number of questions</label>
                <div className="flex gap-3">
                  {[5, 10, 15].map((n) => (
                    <label key={n} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#2d2d2d]">
                      <input
                        type="radio"
                        name="questionCount"
                        value={n}
                        checked={questionCount === n}
                        onChange={() => setQuestionCount(n)}
                        className="accent-[#5b8f8a]"
                      />
                      {n}
                    </label>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">Difficulty</label>
                <div className="flex gap-3">
                  {(["Easy", "Medium", "Challenge"] as const).map((d) => (
                    <label key={d} className="flex items-center gap-1.5 cursor-pointer text-sm text-[#2d2d2d]">
                      <input
                        type="radio"
                        name="difficulty"
                        value={d}
                        checked={difficulty === d}
                        onChange={() => setDifficulty(d)}
                        className="accent-[#5b8f8a]"
                      />
                      {d}
                    </label>
                  ))}
                </div>
              </div>

              {/* Question types */}
              <div>
                <label className="block text-sm font-medium text-[#2d2d2d] mb-2">Question types</label>
                <div className="space-y-2">
                  {QUESTION_TYPE_OPTIONS.map((qt) => (
                    <label key={qt.value} className="flex items-center gap-2 cursor-pointer text-sm text-[#2d2d2d]">
                      <input
                        type="checkbox"
                        checked={questionTypes.includes(qt.value)}
                        onChange={() => toggleQuestionType(qt.value)}
                        className="h-4 w-4 rounded border-[#e0dbd5] accent-[#5b8f8a] cursor-pointer"
                      />
                      {qt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Turnstile */}
              <div>
                <p className="text-sm text-[#8a8580] mb-1">Security check</p>
                <TurnstileWidget
                  onVerify={(token: string) => setTurnstileToken(token)}
                  onError={() => setTurnstileToken(null)}
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#5b8f8a] hover:bg-[#3d6e69] disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors"
              >
                Generate Quiz
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // ── Quiz display (phase 2) ────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <div className="bg-[#5b8f8a] text-white px-4 py-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <a href="/" className="font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">Unbound</a>
            <h1 className="text-lg font-semibold mt-1 text-white/90">Quiz</h1>
          </div>
          <a
            href={`/plan/${planId}`}
            className="text-white/80 hover:text-white text-sm font-medium underline underline-offset-2"
          >
            Back to Plan
          </a>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#e8e4e0] p-1 rounded-xl mb-6">
          <button
            onClick={() => setActiveTab("take")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "take"
                ? "bg-white text-[#2d2d2d] shadow-sm"
                : "text-[#8a8580] hover:text-[#2d2d2d]"
            }`}
          >
            Take Quiz
          </button>
          <button
            onClick={() => setActiveTab("print")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === "print"
                ? "bg-white text-[#2d2d2d] shadow-sm"
                : "text-[#8a8580] hover:text-[#2d2d2d]"
            }`}
          >
            Print
          </button>
        </div>

        {/* Score banner */}
        {submitted && score && (
          <div className="bg-[#e8f4f3] rounded-xl px-5 py-4 mb-6 text-center">
            <p className="text-2xl font-bold text-[#2d2d2d]">
              {score.correct} / {score.total}
            </p>
            <p className="text-sm text-[#5b8f8a] mt-1">
              {score.total > 0
                ? `${Math.round((score.correct / score.total) * 100)}% correct`
                : "No scorable questions"}
            </p>
          </div>
        )}

        {/* Take Quiz tab */}
        {activeTab === "take" && (
          <div className="space-y-5">
            {quiz.questions.map((q, idx) => {
              const correct = submitted ? isCorrect(q) : null;
              const borderColor = correct === null
                ? "border-[#e8e4e0]"
                : correct
                  ? "border-green-400"
                  : "border-red-400";

              return (
                <div
                  key={q.id}
                  className={`bg-white rounded-2xl border-2 ${borderColor} shadow-sm p-5`}
                >
                  <p className="text-xs text-[#8a8580] mb-1 uppercase tracking-wide">
                    {q.type.replace("_", " ")} - Question {idx + 1}
                  </p>
                  <p className="text-[#2d2d2d] font-medium mb-3">{q.question}</p>

                  {/* Multiple choice */}
                  {q.type === "multiple_choice" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-[#2d2d2d]">
                          <input
                            type="radio"
                            name={q.id}
                            value={opt.charAt(0)}
                            checked={answers[q.id] === opt.charAt(0)}
                            onChange={() => setAnswer(q.id, opt.charAt(0))}
                            disabled={submitted}
                            className="accent-[#5b8f8a]"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {/* True/False */}
                  {q.type === "true_false" && (
                    <div className="flex gap-3">
                      {["True", "False"].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => !submitted && setAnswer(q.id, val)}
                          disabled={submitted}
                          className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            answers[q.id] === val
                              ? "bg-[#5b8f8a] text-white border-[#5b8f8a]"
                              : "bg-white text-[#2d2d2d] border-[#e0dbd5] hover:bg-[#f4f1ee]"
                          } disabled:opacity-70`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Fill in the blank */}
                  {q.type === "fill_blank" && (
                    <input
                      type="text"
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      disabled={submitted}
                      placeholder="Type your answer..."
                      className="w-full border border-[#e0dbd5] rounded-lg px-3 py-2.5 text-[#2d2d2d] bg-[#faf9f6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] text-sm disabled:opacity-70"
                    />
                  )}

                  {/* Matching */}
                  {q.type === "matching" && q.matchPairs && (
                    <div className="space-y-2">
                      {q.matchPairs.map((pair, pi) => {
                        const currentAnswers = (Array.isArray(answers[q.id]) ? answers[q.id] : []) as string[];
                        return (
                          <div key={pi} className="flex items-center gap-3 text-sm">
                            <span className="font-medium text-[#2d2d2d] min-w-[120px]">{pair.left}</span>
                            <span className="text-[#8a8580]">=</span>
                            <select
                              value={currentAnswers[pi] ?? ""}
                              onChange={(e) => {
                                const updated = [...currentAnswers];
                                // Ensure array is long enough
                                while (updated.length <= pi) updated.push("");
                                updated[pi] = e.target.value;
                                setAnswer(q.id, updated);
                              }}
                              disabled={submitted}
                              className="flex-1 border border-[#e0dbd5] rounded-lg px-3 py-2 text-[#2d2d2d] bg-[#faf9f6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] text-sm disabled:opacity-70"
                            >
                              <option value="">Select...</option>
                              {q.matchPairs!.map((mp) => (
                                <option key={mp.right} value={`${pair.left}:${mp.right}`}>
                                  {mp.right}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Extended response */}
                  {q.type === "extended" && (
                    <textarea
                      value={(answers[q.id] as string) ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      disabled={submitted}
                      placeholder="Write your response..."
                      rows={4}
                      className="w-full border border-[#e0dbd5] rounded-lg px-3 py-2.5 text-[#2d2d2d] bg-[#faf9f6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] text-sm resize-none disabled:opacity-70"
                    />
                  )}

                  {/* Show correct answer after submission */}
                  {submitted && correct === false && (
                    <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      Correct answer: {Array.isArray(q.answer) ? q.answer.join(", ") : q.answer}
                    </p>
                  )}
                  {submitted && q.type === "extended" && q.modelAnswer && (
                    <div className="mt-3 text-sm text-[#3d6e69] bg-[#e8f4f3] rounded-lg px-3 py-2">
                      <p className="font-medium mb-1">Model answer:</p>
                      <p>{q.modelAnswer}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {!submitted && (
              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="w-full bg-[#5b8f8a] hover:bg-[#3d6e69] text-white font-semibold text-lg py-4 rounded-xl transition-colors"
              >
                Submit Quiz
              </button>
            )}
          </div>
        )}

        {/* Print tab */}
        {activeTab === "print" && (
          <div className="bg-white rounded-2xl border border-[#e8e4e0] shadow-sm p-6 space-y-4">
            <p className="text-[#2d2d2d] text-sm mb-4">
              Download printable versions of this quiz.
            </p>
            <a
              href={`/api/quiz-pdf/student/${quiz.quizId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#5b8f8a] hover:bg-[#3d6e69] text-white font-semibold text-center py-3 rounded-xl transition-colors"
            >
              Download Student Quiz (PDF)
            </a>
            <a
              href={`/api/quiz-pdf/answer-key/${quiz.quizId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-white border-2 border-[#5b8f8a] text-[#5b8f8a] hover:bg-[#e8f4f3] font-semibold text-center py-3 rounded-xl transition-colors"
            >
              Download Answer Key (PDF)
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
