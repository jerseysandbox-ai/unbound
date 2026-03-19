"use client";

/**
 * /outline/[id]
 *
 * Iterative outline review page. Displays subjects as cards with per-subject
 * tweak inputs and a global feedback textarea. Supports regenerating the
 * outline as many times as needed before committing to full plan generation.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

/** Clean SVG line icons per subject — no emojis */
function SubjectIcon({ subject }: { subject: string }) {
  const s = subject.toLowerCase();
  const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className: "w-6 h-6" };
  if (s.includes("math"))
    return <svg {...props}><path d="M12 4v16M4 12h16M6 6l12 12M18 6L6 18"/></svg>;
  if (s.includes("science"))
    return <svg {...props}><path d="M9 3h6v5l3 8H6l3-8V3z"/><path d="M6 16h12"/><circle cx="9" cy="20" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="20" r="1" fill="currentColor" stroke="none"/></svg>;
  if (s.includes("language") || s.includes("literacy"))
    return <svg {...props}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
  if (s.includes("social") || s.includes("history") || s.includes("geography"))
    return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>;
  if (s.includes("sel") || s.includes("life") || s.includes("executive"))
    return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>;
  if (s.includes("art") || s.includes("creative") || s.includes("studio"))
    return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3-.5 3-2 0-.56-.08-1.08-.22-1.57-.3-1.1.53-2.43 1.72-2.43H18c2.21 0 4-1.79 4-4 0-4.42-4.03-8-10-8z"/></svg>;
  if (s.includes("entrepreneur") || s.includes("business"))
    return <svg {...props}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
  return <svg {...props}><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2V3z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7V3z"/></svg>;
}

interface OutlineSubject {
  subject: string;
  emoji: string;
  summary: string;
  estimatedMinutes: number;
}

interface OutlineData {
  subjects: OutlineSubject[];
  profile: { childName: string };
  generatedAt: string;
  // fullProfile is returned by get-outline and used for server-side regeneration
  fullProfile?: unknown;
}

export default function OutlinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-subject tweak state: keyed by subject name
  const [subjectTweaks, setSubjectTweaks] = useState<Record<string, string>>({});
  // Which subject cards have the tweak input expanded
  const [expandedTweaks, setExpandedTweaks] = useState<Record<string, boolean>>({});
  // Global feedback textarea
  const [globalFeedback, setGlobalFeedback] = useState("");

  // Regeneration state
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  // Full plan generation state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch outline from API
  useEffect(() => {
    if (!id) return;

    fetch(`/api/get-outline/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Outline not found");
        }
        return res.json();
      })
      .then((data) => setOutline(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load outline"))
      .finally(() => setLoading(false));
  }, [id]);

  // Toggle per-subject tweak input
  function toggleTweak(subject: string) {
    setExpandedTweaks((prev) => ({ ...prev, [subject]: !prev[subject] }));
  }

  // Regenerate outline with current tweaks and global feedback.
  // Profile is NOT read from sessionStorage — the server retrieves it from KV
  // using the paymentIntentId. This fixes the "Session expired" bug.
  const handleRegenerate = useCallback(async () => {
    if (!outline) return;
    setRegenerating(true);
    setRegenError(null);

    // Build subject tweaks array (only include non-empty feedback)
    const tweaks = Object.entries(subjectTweaks)
      .filter(([, feedback]) => feedback.trim())
      .map(([subject, feedback]) => ({ subject, feedback }));

    try {
      const res = await fetch("/api/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: id,
          // No profile needed — server fetches it from KV using paymentIntentId
          regenerate: true,
          subjectTweaks: tweaks,
          globalFeedback: globalFeedback.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Regeneration failed");
      }

      const data = await res.json();
      if (data.outline) {
        // Update outline with new data, clear tweaks
        setOutline(data.outline);
        setSubjectTweaks({});
        setExpandedTweaks({});
        setGlobalFeedback("");
      }
    } catch (err: unknown) {
      setRegenError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRegenerating(false);
    }
  }, [outline, id, subjectTweaks, globalFeedback]);

  // Trigger full plan generation and redirect immediately to the scribe screen.
  // We fire the API call without awaiting it so the parent sees the Sage right away —
  // the generating page polls /api/plan-status/[id] and handles completion itself.
  function handleBuildPlan() {
    setSubmitting(true);
    setSubmitError(null);

    // Kick off generation in the background — don't await
    fetch("/api/generate-full-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: id,
        feedback: globalFeedback.trim() || undefined,
      }),
    }).catch(() => {
      // Errors will surface via the status poller on the generating page
    });

    // Redirect immediately so the parent sees the Sage wait screen right away
    router.push(`/generating/${id}?phase=full`);
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-[#5b8f8a] font-medium">Loading your outline...</p>
        </div>
      </main>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !outline) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">😔</div>
          <h1 className="text-xl font-bold text-[#2d2d2d] mb-2">Outline not found</h1>
          <p className="text-[#8a8580] mb-6 text-sm">
            {error || "This outline may have expired. Plans last 24 hours."}
          </p>
          <a
            href="/profile"
            className="inline-block bg-[#5b8f8a] text-white font-semibold px-6 py-3 rounded-xl text-sm"
          >
            Start over
          </a>
        </div>
      </main>
    );
  }

  const totalMinutes = outline.subjects.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const totalHours = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60 > 0 ? `${totalMinutes % 60}m` : ""}`.trim()
    : `${totalMinutes}m`;

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      {/* Header */}
      <div className="bg-[#5b8f8a] text-white px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <span className="font-bold text-xl">Unbound</span>
          <h1 className="text-lg font-semibold mt-1 text-white/90">
            {outline.profile.childName}&apos;s Plan for Today - here&apos;s what we&apos;re thinking
          </h1>
          <p className="text-sm text-white/70 mt-0.5">
            {outline.subjects.length} subjects · ~{totalHours} total
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Intro text */}
        <p className="text-[#4a4a4a] text-sm leading-relaxed">
          Take a look at what each subject will cover. Tap &quot;Tweak this&quot; on any card to adjust it,
          then regenerate as many times as you like. When it looks right, build the full plan.
        </p>

        {/* Subject cards */}
        {outline.subjects.map((subject, i) => (
          <div
            key={`${subject.subject}-${i}`}
            className="bg-white rounded-2xl border border-[#e8e4e0] shadow-sm overflow-hidden"
            style={{ animation: `card-in 0.3s ease-out ${i * 0.07}s both` }}
          >
            <div className="p-5">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 text-[#5b8f8a] mt-0.5" aria-hidden="true">
                  <SubjectIcon subject={subject.subject} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h2 className="font-bold text-[#2d2d2d] text-base">{subject.subject}</h2>
                    <span className="text-xs font-medium text-[#5b8f8a] bg-[#e8f4f3] px-2.5 py-1 rounded-full shrink-0">
                      ~{subject.estimatedMinutes} min
                    </span>
                  </div>
                  <p className="text-[#5a5550] text-sm leading-relaxed">{subject.summary}</p>
                </div>
              </div>

              {/* Tweak toggle button */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => toggleTweak(subject.subject)}
                  className="text-xs text-[#5b8f8a] hover:text-[#3d6e69] font-medium transition-colors"
                >
                  {expandedTweaks[subject.subject] ? "▲ close" : "Tweak this →"}
                </button>
              </div>
            </div>

            {/* Per-subject tweak input - inline, animated */}
            {expandedTweaks[subject.subject] && (
              <div className="border-t border-[#f0ece8] bg-[#faf9f6] px-5 py-4">
                <label className="block text-xs font-medium text-[#5b8f8a] mb-1.5">
                  What would you like to change about {subject.subject}?
                </label>
                <textarea
                  value={subjectTweaks[subject.subject] || ""}
                  onChange={(e) =>
                    setSubjectTweaks((prev) => ({ ...prev, [subject.subject]: e.target.value }))
                  }
                  rows={2}
                  maxLength={300}
                  placeholder={`e.g. make the math easier, skip this today, use her Minecraft interest more`}
                  className="w-full rounded-lg border border-[#e0dbd5] px-3 py-2 text-sm text-[#2d2d2d] placeholder:text-[#b0aba6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] resize-none bg-white"
                />
              </div>
            )}
          </div>
        ))}

        {/* Global feedback */}
        <div className="bg-white rounded-2xl border border-[#e8e4e0] p-5 shadow-sm">
          <label
            htmlFor="globalFeedback"
            className="block text-sm font-semibold text-[#2d2d2d] mb-1"
          >
            Anything else to adjust overall?{" "}
            <span className="text-[#8a8580] font-normal">(optional)</span>
          </label>
          <p className="text-xs text-[#8a8580] mb-2">
            Overall pacing, tone, or anything that doesn&apos;t fit a specific subject.
          </p>
          <textarea
            id="globalFeedback"
            value={globalFeedback}
            onChange={(e) => setGlobalFeedback(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. She's having a rough day - keep everything lighter and shorter today"
            className="w-full rounded-xl border border-[#e8e4e0] px-4 py-3 text-sm text-[#2d2d2d] placeholder:text-[#b0aba6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] resize-none"
          />
        </div>

        {/* Regen error */}
        {regenError && (
          <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
            {regenError}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          {/* Regenerate - secondary */}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={regenerating || submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-[#5b8f8a] hover:bg-[#e8f4f3] disabled:opacity-60 text-[#5b8f8a] font-semibold py-4 rounded-2xl transition-colors"
          >
            {regenerating ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-[#5b8f8a] border-t-transparent rounded-full animate-spin" />
                Rethinking...
              </>
            ) : (
              "Regenerate Outline"
            )}
          </button>

          {/* Build full plan - primary */}
          <button
            type="button"
            onClick={handleBuildPlan}
            disabled={submitting || regenerating}
            className="flex-1 bg-[#5b8f8a] hover:bg-[#3d6e69] disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-colors shadow-md"
          >
            {submitting ? "Starting..." : "Build My Full Plan →"}
          </button>
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
            {submitError}
          </p>
        )}

        <p className="text-center text-xs text-[#8a8580] pb-4">
          Includes printable teacher guide and student packet. Usually 60-90 seconds, up to 2 minutes for detailed plans.
        </p>
      </div>

      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
