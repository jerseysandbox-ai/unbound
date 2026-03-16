"use client";

/**
 * /generating/[id]
 *
 * Scribe wait screen. A warm, literary waiting experience while the agents work.
 * Features an SVG scribe illustration with animated candle flame, rotating
 * status messages in warm prose, and a smooth progress bar.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

// ─── Status messages per phase ───────────────────────────────────────────────

const OUTLINE_MESSAGES = [
  "Sage is reading between the lines of your child's profile...",
  "Mapping the landscape of today's learning...",
  "Sketching the shape of your day...",
  "Finding the right balance for this particular morning...",
  "Almost ready to share the plan...",
];

const FULL_MESSAGES = [
  "Euler is constructing a mathematical adventure...",
  "Darwin is uncovering a scientific mystery...",
  "Paige is finding just the right words...",
  "Atlas is charting new territory...",
  "Grounded is planning a moment of calm...",
  "Studio is preparing a creative invitation...",
  "Spark is dreaming up something worth building...",
  "Architect is weaving it all into one beautiful day...",
  "Putting the finishing touches on your plan...",
];

// ─── Scribe SVG illustration ─────────────────────────────────────────────────

function ScribeIllustration() {
  return (
    <svg
      viewBox="0 0 200 220"
      width="200"
      height="220"
      aria-hidden="true"
      className="mx-auto"
      fill="none"
      stroke="#5b8f8a"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Writing desk */}
      <line x1="20" y1="175" x2="180" y2="175" />
      <line x1="20" y1="175" x2="30" y2="210" />
      <line x1="180" y1="175" x2="170" y2="210" />
      <rect x="30" y="160" width="140" height="15" rx="2" />

      {/* Paper / scroll on desk */}
      <rect x="60" y="140" width="80" height="22" rx="3" fill="#f0f8f7" stroke="#5b8f8a" strokeWidth="1.2" />
      {/* Lines on paper */}
      <line x1="70" y1="147" x2="130" y2="147" strokeWidth="0.8" />
      <line x1="70" y1="152" x2="120" y2="152" strokeWidth="0.8" />
      <line x1="70" y1="157" x2="125" y2="157" strokeWidth="0.8" />

      {/* Scholar body */}
      {/* Robe */}
      <path d="M75 120 Q70 155 65 162 L135 162 Q130 155 125 120 Z" fill="#e8f4f3" strokeWidth="1.4" />
      {/* Arms */}
      <path d="M75 125 Q60 135 65 148" />
      <path d="M125 125 Q140 135 135 148" />

      {/* Neck */}
      <rect x="92" y="103" width="16" height="18" rx="4" fill="#e8f4f3" />

      {/* Head */}
      <ellipse cx="100" cy="92" rx="22" ry="24" fill="#e8f4f3" />

      {/* Scholar cap */}
      <path d="M78 85 Q100 68 122 85" fill="#5b8f8a" stroke="#5b8f8a" strokeWidth="1" />
      <rect x="85" y="74" width="30" height="5" rx="2" fill="#5b8f8a" stroke="none" />
      <line x1="115" y1="76" x2="128" y2="88" strokeWidth="1.5" />
      {/* Tassel */}
      <circle cx="128" cy="89" r="3" fill="#5b8f8a" stroke="none" />
      <line x1="128" y1="92" x2="126" y2="100" strokeWidth="1.2" />
      <line x1="128" y1="92" x2="130" y2="100" strokeWidth="1.2" />

      {/* Face */}
      <circle cx="93" cy="92" r="1.5" fill="#5b8f8a" stroke="none" />
      <circle cx="107" cy="92" r="1.5" fill="#5b8f8a" stroke="none" />
      <path d="M93 100 Q100 105 107 100" strokeWidth="1.4" />

      {/* Quill pen - right hand holding it */}
      <path d="M132 145 Q145 120 150 100" strokeWidth="1.6" />
      <path d="M150 100 Q160 85 155 75 Q148 80 145 90 Q143 97 150 100" fill="#e8f4f3" />
      {/* Quill feather detail */}
      <path d="M155 75 Q152 82 148 88" strokeWidth="0.8" />
      <path d="M153 77 Q150 83 147 89" strokeWidth="0.8" />
      {/* Ink point */}
      <path d="M132 145 L130 149" strokeWidth="1.8" />

      {/* Candle - left side of desk */}
      <rect x="42" y="145" width="12" height="18" rx="1" fill="#fef9e7" stroke="#5b8f8a" strokeWidth="1.2" />
      {/* Candle drip */}
      <path d="M42 149 Q40 152 41 155" strokeWidth="1" />
      {/* Wick */}
      <line x1="48" y1="145" x2="48" y2="141" strokeWidth="1.5" />
      {/* Flame - will be animated */}
      <g className="candle-flame">
        <path
          d="M48 141 Q44 136 46 130 Q48 124 48 120 Q50 124 52 130 Q54 136 48 141 Z"
          fill="#f59e0b"
          stroke="none"
          opacity="0.9"
        />
        <path
          d="M48 139 Q46 135 47 130 Q48 126 48 123 Q49 126 50 130 Q51 135 48 139 Z"
          fill="#fbbf24"
          stroke="none"
          opacity="0.8"
        />
        <path
          d="M48 138 Q47 135 48 131 Q48 128 48 126 Q49 129 49 132 Q49 135 48 138 Z"
          fill="#fef3c7"
          stroke="none"
          opacity="0.7"
        />
      </g>
      {/* Candle holder */}
      <ellipse cx="48" cy="163" rx="10" ry="3" fill="#e8f4f3" />
      <line x1="38" y1="163" x2="58" y2="163" strokeWidth="1.2" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function GeneratingPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const phase = searchParams.get("phase") === "full" ? "full" : "outline";
  const messages = phase === "full" ? FULL_MESSAGES : OUTLINE_MESSAGES;
  const estimatedTime =
    phase === "full"
      ? "This takes about 60-90 seconds depending on your plan."
      : "This takes about 15 seconds.";

  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Rotate through status messages every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIdx((i) => (i + 1) % messages.length);
    }, 4000);
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

        setProgress(data.progress ?? 0);
        if (data.message) setApiMessage(data.message);

        if (data.phase === "error") {
          setError(data.message || "Something went wrong. Please contact support.");
          return;
        }

        if (phase === "outline" && data.phase === "outline_ready") {
          router.replace(`/outline/${id}`);
          return;
        }
        if (phase === "full" && data.phase === "complete") {
          router.replace(`/plan/${id}`);
          return;
        }
      } catch {
        // Network hiccup - keep trying
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [id, phase, router]);

  // Display message: prefer API message, else rotate
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
        {/* Logo */}
        <div className="mb-8">
          <span className="text-[#5b8f8a] font-bold text-2xl tracking-tight">Unbound</span>
        </div>

        {/* Scribe illustration */}
        <div className="mb-8">
          <ScribeIllustration />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-[#2d2d2d] mb-1">
          {phase === "full" ? "Your plan is being written..." : "Shaping your outline..."}
        </h1>

        {/* Status message */}
        <p
          key={displayMessage}
          className="text-[#5b8f8a] text-sm italic mb-6 min-h-[2.5rem] flex items-center justify-center"
          style={{ animation: "message-fade 0.6s ease-in-out" }}
        >
          {displayMessage}
        </p>

        {/* Progress bar */}
        <div className="w-full bg-[#e8e4e0] rounded-full h-1.5 mb-3 overflow-hidden">
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${Math.max(progress, 3)}%`,
              background: "linear-gradient(90deg, #5b8f8a, #7ab5b0)",
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* Time estimate */}
        <p className="text-xs text-[#b0aba6]">{estimatedTime}</p>
      </div>

      <style>{`
        .candle-flame {
          animation: flicker 1.8s ease-in-out infinite alternate;
          transform-origin: 48px 141px;
        }
        @keyframes flicker {
          0%   { transform: scaleX(1)   scaleY(1)   translateY(0); opacity: 1; }
          25%  { transform: scaleX(0.9) scaleY(1.05) translateY(-1px); opacity: 0.95; }
          50%  { transform: scaleX(1.1) scaleY(0.95) translateY(1px); opacity: 0.9; }
          75%  { transform: scaleX(0.95) scaleY(1.08) translateY(-2px); opacity: 1; }
          100% { transform: scaleX(1.05) scaleY(0.97) translateY(0); opacity: 0.95; }
        }
        @keyframes message-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
