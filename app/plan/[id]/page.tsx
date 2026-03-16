"use client";

/**
 * /plan/[id]
 *
 * Plan display page. Shows the Scholar's inspirational quote at the top,
 * then splits the plan into Teacher Guide and Student Packet tabs.
 *
 * Content is split by [TEACHER]...[/TEACHER] and [STUDENT]...[/STUDENT] tags
 * that the Architect preserves from each specialist's output.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { GeneratedPlan, ScholarQuote } from "@/lib/agents";

// ─── Content parsing helpers ─────────────────────────────────────────────────

/**
 * Extract teacher-only content from a plan string.
 * Returns plan text with [STUDENT]...[/STUDENT] blocks removed
 * and [TEACHER]...[/TEACHER] tags stripped (keeping the inner content).
 */
function extractTeacherContent(plan: string): string {
  return plan
    // Remove [STUDENT]...[/STUDENT] blocks entirely
    .replace(/\[STUDENT\][\s\S]*?\[\/STUDENT\]/g, "")
    // Strip [TEACHER] tags, keeping inner content
    .replace(/\[TEACHER\]/g, "")
    .replace(/\[\/TEACHER\]/g, "")
    // Clean up extra blank lines from removed blocks
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extract student-facing content from a plan string.
 * Returns only what's inside [STUDENT]...[/STUDENT] blocks,
 * plus the subject headings (## lines) for structure.
 */
function extractStudentContent(plan: string): string {
  const lines = plan.split("\n");
  const studentChunks: string[] = [];
  let currentHeading = "";
  let headingAdded = false;

  // Walk line by line, picking up ## headings and STUDENT blocks
  let insideStudent = false;
  let studentBuffer: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      currentHeading = line;
      headingAdded = false;
    }

    if (line.trim() === "[STUDENT]") {
      insideStudent = true;
      studentBuffer = [];
      continue;
    }
    if (line.trim() === "[/STUDENT]") {
      insideStudent = false;
      if (studentBuffer.length > 0) {
        if (!headingAdded && currentHeading) {
          studentChunks.push(currentHeading);
          headingAdded = true;
        }
        studentChunks.push(studentBuffer.join("\n"));
        studentChunks.push("");
      }
      continue;
    }

    if (insideStudent) {
      studentBuffer.push(line);
    }
  }

  return studentChunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ─── Scholar Quote display ───────────────────────────────────────────────────

function QuoteBlock({ quote }: { quote: ScholarQuote }) {
  return (
    <div className="border-l-4 border-[#5b8f8a] pl-5 py-2 my-6 bg-[#f4faf9] rounded-r-xl">
      <p className="text-[#2d2d2d] italic text-base leading-relaxed mb-2">
        &ldquo;{quote.text}&rdquo;
      </p>
      <p className="text-[#5b8f8a] text-sm font-medium">
        - {quote.attribution}
      </p>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"teacher" | "student">("teacher");

  useEffect(() => {
    if (!id) return;

    async function fetchPlan() {
      try {
        const res = await fetch(`/api/get-plan/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Plan not found");
        }
        const data = await res.json();
        setPlan(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load plan");
      } finally {
        setLoading(false);
      }
    }

    fetchPlan();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌱</div>
          <p className="text-[#5b8f8a] font-medium">Loading your plan...</p>
        </div>
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">😔</div>
          <h1 className="text-xl font-bold text-[#2d2d2d] mb-2">Plan not found</h1>
          <p className="text-[#8a8580] mb-6">
            {error || "This plan may have expired (plans last 24 hours)."}
          </p>
          <a
            href="/profile"
            className="inline-block bg-[#5b8f8a] text-white font-semibold px-6 py-3 rounded-xl"
          >
            Create a new plan
          </a>
        </div>
      </main>
    );
  }

  const date = new Date(plan.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Parse content for each tab
  const teacherContent = extractTeacherContent(plan.plan);
  const studentContent = extractStudentContent(plan.plan);

  const contentToShow = activeTab === "teacher" ? teacherContent : studentContent;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          article { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <main className="min-h-screen bg-[#faf9f6]">
        {/* Header bar */}
        <div className="bg-[#5b8f8a] text-white px-4 py-4 no-print">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div>
              <span className="font-bold text-lg">Unbound</span>
              <p className="text-sm text-white/80 mt-0.5">
                {plan.profile.childName}&apos;s Plan - {date}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-white text-[#5b8f8a] font-semibold text-sm px-4 py-2 rounded-lg hover:bg-[#e8f4f3] transition-colors shrink-0"
            >
              Save as PDF
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Scholar quote */}
          {plan.quote && <QuoteBlock quote={plan.quote} />}

          {/* Tabs */}
          <div className="flex gap-1 bg-[#e8e4e0] p-1 rounded-xl mb-6 no-print">
            <button
              onClick={() => setActiveTab("teacher")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "teacher"
                  ? "bg-white text-[#2d2d2d] shadow-sm"
                  : "text-[#8a8580] hover:text-[#2d2d2d]"
              }`}
            >
              Teacher Guide
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === "student"
                  ? "bg-white text-[#2d2d2d] shadow-sm"
                  : "text-[#8a8580] hover:text-[#2d2d2d]"
              }`}
            >
              Student Packet
            </button>
          </div>

          {/* Print button for current tab */}
          <div className="flex justify-end mb-4 no-print">
            <button
              onClick={() => window.print()}
              className="text-sm text-[#5b8f8a] border border-[#5b8f8a] px-4 py-1.5 rounded-lg hover:bg-[#e8f4f3] transition-colors font-medium"
            >
              {activeTab === "teacher" ? "Print Teacher Guide" : "Print Student Packet"}
            </button>
          </div>

          {/* Student packet intro */}
          {activeTab === "student" && (
            <div className="bg-[#e8f4f3] rounded-xl px-5 py-3 mb-5 no-print">
              <p className="text-sm text-[#3d6e69]">
                This is the student-facing view - just the activities and worksheets, no teacher notes.
                Print this for your learner.
              </p>
            </div>
          )}

          {/* Plan content */}
          <article className="bg-white rounded-2xl shadow-sm border border-[#e8e4e0] p-6 sm:p-8 prose prose-stone max-w-none prose-headings:text-[#2d2d2d] prose-h2:text-[#5b8f8a]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {contentToShow}
            </ReactMarkdown>
          </article>

          {/* Agent credits - teacher tab only */}
          {activeTab === "teacher" && (
            <div className="mt-8 no-print">
              <h2 className="text-sm font-semibold text-[#8a8580] uppercase tracking-wide mb-4">
                Generated by the Unbound Agent Team
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {plan.agentOutputs.map((agent) => (
                  <div
                    key={agent.subject}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm ${
                      agent.error
                        ? "bg-red-50 text-red-600"
                        : "bg-[#e8f4f3] text-[#3d6e69]"
                    }`}
                  >
                    <span className="font-medium">{agent.agentName}</span>
                    <span className="text-xs opacity-70">- {agent.subject}</span>
                    {agent.error && (
                      <span className="text-xs ml-auto">unavailable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer CTA */}
          <div className="mt-10 text-center no-print">
            <p className="text-[#8a8580] text-sm mb-3">
              Want a plan for another day? It&apos;s always just $9.
            </p>
            <a
              href="/profile"
              className="inline-block bg-[#5b8f8a] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-[#3d6e69] transition-colors"
            >
              Create Another Plan
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
