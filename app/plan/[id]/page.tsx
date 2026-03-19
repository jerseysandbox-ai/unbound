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
/** Clean SVG line icons per subject — no emojis */
function SubjectIcon({ subject }: { subject: string }) {
  const s = subject.toLowerCase();
  const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "w-5 h-5" };

  if (s.includes("math"))
    return <svg {...props}><path d="M12 4v16M4 12h16M6 6l12 12M18 6L6 18"/></svg>;
  if (s.includes("science"))
    return <svg {...props}><path d="M9 3h6v5l3 8H6l3-8V3z"/><path d="M6 16h12"/><circle cx="9" cy="20" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="20" r="1" fill="currentColor" stroke="none"/></svg>;
  if (s.includes("language") || s.includes("literacy") || s.includes("arts") && s.includes("lang"))
    return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
  if (s.includes("social") || s.includes("history") || s.includes("geography"))
    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>;
  if (s.includes("sel") || s.includes("life") || s.includes("social-emo") || s.includes("executive"))
    return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
  if (s.includes("art") || s.includes("creative") || s.includes("studio"))
    return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3-.5 3-2 0-.56-.08-1.08-.22-1.57-.3-1.1.53-2.43 1.72-2.43H18c2.21 0 4-1.79 4-4 0-4.42-4.03-8-10-8z"/></svg>;
  if (s.includes("entrepreneur") || s.includes("spark") || s.includes("business"))
    return <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
  // fallback — open book
  return <svg {...props}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z"/></svg>;
}

function extractTeacherContent(plan: string): string {
  return plan
    // Remove [STUDENT]...[/STUDENT] blocks entirely (handles whitespace/newlines around tags)
    .replace(/\[\s*STUDENT\s*\][\s\S]*?\[\s*\/STUDENT\s*\]/gi, "")
    // Strip any orphaned [STUDENT] or [/STUDENT] tags that weren't closed properly
    .replace(/\[\s*\/?STUDENT\s*\]/gi, "")
    // Strip [TEACHER] / [/TEACHER] tags, keeping inner content
    .replace(/\[\s*\/?TEACHER\s*\]/gi, "")
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
            <div className="flex gap-2 shrink-0">
              <a
                href={`/api/download-pdf/${id}?type=teacher`}
                download
                className="bg-white text-[#5b8f8a] font-semibold text-sm px-3 py-2 rounded-lg hover:bg-[#e8f4f3] transition-colors"
              >
                Teacher PDF
              </a>
              <a
                href={`/api/download-pdf/${id}?type=student`}
                download
                className="bg-[#3d6e69] text-white font-semibold text-sm px-3 py-2 rounded-lg hover:bg-[#2a4e4a] transition-colors border border-white/20"
              >
                Student PDF
              </a>
            </div>
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

          {/* Download button for current tab */}
          <div className="flex justify-end mb-4 no-print">
            <a
              href={`/api/download-pdf/${id}?type=${activeTab}`}
              download
              className="text-sm text-[#5b8f8a] border border-[#5b8f8a] px-4 py-1.5 rounded-lg hover:bg-[#e8f4f3] transition-colors font-medium"
            >
              {activeTab === "teacher" ? "Download Teacher Guide PDF" : "Download Student Packet PDF"}
            </a>
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

          {/* Subjects covered - teacher tab only */}
          {activeTab === "teacher" && plan.agentOutputs.some(a => !a.error) && (
            <div className="mt-8 no-print">
              <h2 className="text-sm font-semibold text-[#8a8580] uppercase tracking-wide mb-4">
                Subjects Covered Today
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {plan.agentOutputs.filter(a => !a.error).map((agent) => (
                  <div
                    key={agent.subject}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm bg-[#e8f4f3] text-[#3d6e69]"
                  >
                    <span className="shrink-0 w-5 h-5 text-[#5b8f8a]">
                      <SubjectIcon subject={agent.subject} />
                    </span>
                    <span className="font-medium">{agent.subject}</span>
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
