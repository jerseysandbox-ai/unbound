"use client";

/**
 * /generating/[id]
 *
 * Beautiful waiting page used during both phases of plan generation.
 * Reads ?phase=outline or ?phase=full from the URL.
 * Polls /api/plan-status/[id] every 2s and auto-redirects when complete.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

// ─── Status messages per phase ───────────────────────────────────────────────

const OUTLINE_MESSAGES = [
  "Sage is reviewing your learner profile...",
  "Mapping out today's subjects...",
  "Reviewing your priorities...",
  "Building a plan around your learner...",
  "Almost ready...",
];

const FULL_MESSAGES = [
  "Sage is setting the tone for the day...",
  "Euler is building your math activity...",
  "Darwin is crafting a science exploration...",
  "Paige is writing your language arts worksheet...",
  "Atlas is mapping your social studies lesson...",
  "Grounded is planning your SEL moment...",
  "Studio is designing your creative activity...",
  "Spark is dreaming up an entrepreneurship challenge...",
  "Architect is assembling everything...",
  "Adding the finishing touches...",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function GeneratingPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const phase = searchParams.get("phase") === "full" ? "full" : "outline";
  const messages = phase === "full" ? FULL_MESSAGES : OUTLINE_MESSAGES;
  const estimatedTime = phase === "full" ? "Takes about 60–90 seconds" : "Takes about 15–20 seconds";

  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rotate through status messages every 3.5 seconds for visual engagement
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIdx((i) => (i + 1) % messages.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [messages.length]);

  // Poll /api/plan-status/[id] every 2 seconds
  useEffect(() => {
    if (!id) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/plan-status/${id}`);
        if (!res.ok) return;

        const data = await res.json();

        // Update progress bar from API
        setProgress(data.progress ?? 0);
        if (data.message) setApiMessage(data.message);

        if (data.phase === "error") {
          setError(data.message || "Something went wrong. Please contact support.");
          return; // stop polling
        }

        // Redirect when this phase completes
        if (phase === "outline" && data.phase === "outline_ready") {
          router.replace(`/outline/${id}`);
          return;
        }
        if (phase === "full" && data.phase === "complete") {
          router.replace(`/plan/${id}`);
          return;
        }
      } catch {
        // Network hiccup — keep trying
      }
    };

    poll(); // immediate first check
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [id, phase, router]);

  // Display message: use API message if available, else rotate through our list
  const displayMessage = apiMessage || messages[messageIdx];

  if (error) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😔</div>
          <h1 className="text-xl font-bold text-[#2d2d2d] mb-2">Something went wrong</h1>
          <p className="text-[#8a8580] mb-6 text-sm">{error}</p>
          <p className="text-xs text-[#8a8580]">
            Your payment was not lost. Email{" "}
            <a href="mailto:support@unboundlearn.co" className="underline text-[#5b8f8a]">
              support@unboundlearn.co
            </a>{" "}
            with reference ID: <span className="font-mono">{id}</span>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo / brand */}
        <div className="mb-10">
          <span className="text-[#5b8f8a] font-bold text-2xl tracking-tight">Unbound</span>
        </div>

        {/* Pulsing leaf animation */}
        <div className="mb-8 flex justify-center">
          <span
            className="text-7xl"
            style={{ animation: "pulse-leaf 2s ease-in-out infinite" }}
            aria-hidden="true"
          >
            🌱
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-[#2d2d2d] mb-2">
          {phase === "full" ? "Building your full plan…" : "Creating your outline…"}
        </h1>
        <p className="text-[#8a8580] text-sm mb-8">{estimatedTime}</p>

        {/* Progress bar */}
        <div className="w-full bg-[#e8e4e0] rounded-full h-3 mb-5 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.max(progress, 4)}%`,
              background: "linear-gradient(90deg, #5b8f8a, #7ab5b0)",
            }}
          />
        </div>

        {/* Status message */}
        <p
          key={displayMessage}
          className="text-[#5b8f8a] font-medium text-sm"
          style={{ animation: "fade-in 0.5s ease-in-out" }}
        >
          {displayMessage}
        </p>

        {/* Agent list hint for full phase */}
        {phase === "full" && (
          <div className="mt-10 grid grid-cols-4 gap-3 opacity-60">
            {["🧠", "📐", "📖", "✍️", "🌍", "❤️", "🎨", "💡", "📋"].map((emoji, i) => (
              <span
                key={i}
                className="text-2xl"
                style={{
                  animation: `fade-in 0.4s ease-in-out ${i * 0.15}s both`,
                }}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* CSS animations — no library needed */}
      <style>{`
        @keyframes pulse-leaf {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.85; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
