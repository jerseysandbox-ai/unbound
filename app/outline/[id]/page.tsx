"use client";

/**
 * /outline/[id]
 *
 * Outline review page. Fetches the generated outline, displays each subject
 * as a card, collects optional parent feedback, and triggers full plan generation.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
}

export default function OutlinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [outline, setOutline] = useState<OutlineData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
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

  // Trigger full plan generation and redirect to generating page
  async function handleBuildPlan() {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/generate-full-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: id,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start plan generation");
      }

      // Redirect to waiting page for full plan phase
      router.push(`/generating/${id}?phase=full`);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-[#5b8f8a] font-medium">Loading your outline…</p>
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
            {outline.profile.childName}&apos;s Day — Here&apos;s the Shape of It
          </h1>
          <p className="text-sm text-white/70 mt-0.5">
            {outline.subjects.length} subjects · ~{totalHours} total
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Intro text */}
        <p className="text-[#4a4a4a] text-base leading-relaxed">
          We&apos;ve designed a personalized outline for {outline.profile.childName}&apos;s day.
          Take a look at what each subject will cover, then hit the button below to build the
          full printable plan with worksheets and teacher guides.
        </p>

        {/* Subject cards */}
        <div className="space-y-3">
          {outline.subjects.map((subject, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#e8e4e0] p-5 shadow-sm"
              style={{ animation: `card-in 0.3s ease-out ${i * 0.08}s both` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl mt-0.5" aria-hidden="true">{subject.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h2 className="font-bold text-[#2d2d2d] text-base">{subject.subject}</h2>
                    <span className="text-xs font-medium text-[#5b8f8a] bg-[#e8f4f3] px-2.5 py-1 rounded-full shrink-0">
                      ~{subject.estimatedMinutes} min
                    </span>
                  </div>
                  <p className="text-[#5a5550] text-sm leading-relaxed">{subject.summary}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Optional feedback */}
        <div className="bg-white rounded-2xl border border-[#e8e4e0] p-5 shadow-sm">
          <label
            htmlFor="feedback"
            className="block text-sm font-semibold text-[#2d2d2d] mb-1.5"
          >
            Anything you&apos;d like to adjust? <span className="text-[#8a8580] font-normal">(optional)</span>
          </label>
          <p className="text-xs text-[#8a8580] mb-3">
            Tell us if you&apos;d like to skip a subject, add more focus somewhere, or adjust the tone.
          </p>
          <textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Skip entrepreneurship today, she's tired. More focus on reading."
            className="w-full rounded-xl border border-[#e8e4e0] px-4 py-3 text-sm text-[#2d2d2d] placeholder:text-[#b0aba6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] resize-none"
          />
          {/* Character counter — shows when approaching limit */}
          {feedback.length > 400 && (
            <p className="text-xs text-[#8a8580] text-right mt-1">{feedback.length}/500</p>
          )}
        </div>

        {/* Error */}
        {submitError && (
          <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
            {submitError}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={handleBuildPlan}
          disabled={submitting}
          className="w-full bg-[#5b8f8a] hover:bg-[#3d6e69] disabled:opacity-60 text-white font-bold text-lg py-5 rounded-2xl transition-colors shadow-md"
        >
          {submitting ? "Starting…" : "This looks great — build my full plan →"}
        </button>

        <p className="text-center text-xs text-[#8a8580] pb-4">
          The full plan includes printable worksheets and teacher guides for each subject.
          Takes about 60–90 seconds to generate.
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
