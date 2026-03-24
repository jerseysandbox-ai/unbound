"use client";

import { useState } from "react";

interface FeedbackWidgetProps {
  planId: string;
  gradeLevel?: string | null;
  subjects?: string | null;
}

type WidgetState = "idle" | "commenting" | "submitted" | "error";

export default function FeedbackWidget({ planId, gradeLevel, subjects }: FeedbackWidgetProps) {
  const [state, setState] = useState<WidgetState>("idle");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleRating(r: "up" | "down") {
    setRating(r);
    setState("commenting");
  }

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          rating,
          comment: comment.trim() || undefined,
          gradeLevel: gradeLevel || undefined,
          subjects: subjects || undefined,
        }),
      });
      if (res.ok) {
        setState("submitted");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 no-print">
      {/* Feedback card */}
      <div className="bg-white rounded-2xl border border-[#e8e4e0] shadow-sm p-6">
        {state === "submitted" ? (
          <p className="text-center text-[#5b8f8a] font-semibold text-base">
            Thanks for your feedback! 🐾
          </p>
        ) : state === "error" ? (
          <div className="text-center">
            <p className="text-[#8a8580] text-sm mb-3">Something went wrong. Please try again.</p>
            <button
              onClick={() => setState("idle")}
              className="text-sm text-[#5b8f8a] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-[#2d2d2d] font-semibold text-base mb-4 text-center">
              Was this plan helpful?
            </h3>

            {state === "idle" && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleRating("up")}
                  className="flex items-center gap-2 bg-[#e8f4f3] hover:bg-[#d0ebe8] text-[#3d6e69] font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <span className="text-xl">👍</span>
                  <span>Yes</span>
                </button>
                <button
                  onClick={() => handleRating("down")}
                  className="flex items-center gap-2 bg-[#f5f3f0] hover:bg-[#ede9e4] text-[#5a5550] font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  <span className="text-xl">👎</span>
                  <span>Not quite</span>
                </button>
              </div>
            )}

            {state === "commenting" && (
              <div>
                <div className="flex justify-center mb-4">
                  <span className="text-sm text-[#5b8f8a] font-medium">
                    {rating === "up" ? "👍 You said yes — thank you!" : "👎 Got it — we want to do better."}
                  </span>
                </div>
                <div className="relative">
                  <textarea
                    value={comment}
                    onChange={(e) => {
                      if (e.target.value.length <= 140) setComment(e.target.value);
                    }}
                    placeholder="What would make it better? (optional)"
                    rows={3}
                    className="w-full border border-[#e8e4e0] rounded-xl px-4 py-3 text-sm text-[#2d2d2d] placeholder-[#c0bbb6] focus:outline-none focus:border-[#5b8f8a] resize-none"
                  />
                  <span className="absolute bottom-3 right-3 text-xs text-[#c0bbb6]">
                    {comment.length}/140
                  </span>
                </div>
                <div className="flex justify-end mt-3 gap-3">
                  <button
                    onClick={() => { setState("idle"); setRating(null); setComment(""); }}
                    className="text-sm text-[#8a8580] hover:text-[#5a5550] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-[#5b8f8a] hover:bg-[#3d6e69] text-white font-semibold text-sm px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Direct email link — always visible */}
      <p className="text-center text-xs text-[#8a8580] mt-3">
        Want to share more?{" "}
        <a
          href="mailto:nicoleannenewman@gmail.com?subject=Unbound feedback"
          className="text-[#5b8f8a] hover:underline"
        >
          Email Nicole directly →
        </a>
      </p>
    </div>
  );
}
