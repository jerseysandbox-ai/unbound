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
import { createBrowserClient } from "@supabase/ssr";

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

      {/* Quill pen — proper feather with spine, barbs, and nib */}
      {/* Quill shaft / spine running from nib up through feather */}
      <path d="M131 148 Q139 130 147 112 Q153 98 157 82" strokeWidth="1.4" stroke="#5b8f8a" />

      {/* Feather body — right side barbs fanning out from spine */}
      <path
        d="M157 82 Q168 72 172 62 Q165 68 158 78 Q153 86 149 96 Q154 84 162 72 Q156 80 150 92"
        fill="#e8f4f3" stroke="#5b8f8a" strokeWidth="0.9"
      />
      {/* Feather body — left side barbs */}
      <path
        d="M157 82 Q148 70 146 60 Q149 72 152 84 Q147 74 148 62 Q150 76 153 88"
        fill="#e8f4f3" stroke="#5b8f8a" strokeWidth="0.9"
      />
      {/* Feather tip — pointed top of quill */}
      <path d="M157 82 Q163 68 162 58 Q158 66 156 76" fill="#d4ecea" stroke="#5b8f8a" strokeWidth="0.8" />

      {/* Barb detail lines — right side */}
      <path d="M156 84 Q163 77 166 70" strokeWidth="0.6" stroke="#5b8f8a" opacity="0.7" />
      <path d="M153 90 Q161 82 165 74" strokeWidth="0.6" stroke="#5b8f8a" opacity="0.7" />
      <path d="M151 96 Q158 88 162 80" strokeWidth="0.6" stroke="#5b8f8a" opacity="0.7" />
      <path d="M149 102 Q155 94 158 86" strokeWidth="0.6" stroke="#5b8f8a" opacity="0.6" />

      {/* Barb detail lines — left side */}
      <path d="M155 87 Q150 80 149 72" strokeWidth="0.6" stroke="#5b8f8a" opacity="0.7" />
      <path d="M153 93 Q148 85 148 76" strokeWidth="0.6" stroke="#5b8f8a" opacity="0.7" />
      <path d="M151 99 Q147 91 147 82" strokeWidth="0.6" stroke="#5b8f8a" opacity="0.6" />

      {/* Nib — tapered pointed tip where ink meets paper */}
      <path d="M131 148 Q133 143 136 138 Q138 134 139 130" strokeWidth="1.6" stroke="#3d6e69" />
      <path d="M131 148 L129 152" strokeWidth="1.8" stroke="#3d6e69" strokeLinecap="round" />

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
      ? "This usually takes 60-90 seconds. Longer plans may take up to 2 minutes."
      : "This usually takes 15-30 seconds. Please don't close this tab.";

  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds since generation started
  const generateCalled = useRef(false);
  // Suppress flash of outline messaging when transitioning from outline → full phase
  const [phaseReady, setPhaseReady] = useState(false);
  useEffect(() => { setPhaseReady(true); }, [phase]);

  // Email notification opt-in state
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sent" | "error">("idle");
  const [isDone, setIsDone] = useState(false);

  // Pre-fill email from auth
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setNotifyEmail(data.user.email);
    });
  }, []);

  // Rotate through status messages every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIdx((i) => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [messages.length]);

  // Elapsed time counter — increments every second so parents can see progress is happening
  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // When phase=outline, trigger outline generation on mount.
  // This way the checkout page can redirect immediately after payment without
  // waiting for the API call — the generating page owns the generation lifecycle.
  useEffect(() => {
    if (phase !== "outline" || !id || generateCalled.current) return;
    generateCalled.current = true;

    // Read profile from sessionStorage (set by checkout page)
    let profile: unknown = null;
    try {
      const raw = sessionStorage.getItem("unbound_profile");
      if (raw) {
        profile = JSON.parse(raw);
        sessionStorage.removeItem("unbound_profile");
      }
    } catch {
      // Ignore parse errors
    }

    // Call generate-outline (profile may be null if navigating back to this page
    // — in that case the API checks KV cache and returns cached: true if already done)
    fetch("/api/generate-outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: id, profile }),
    }).catch(() => {
      // Network errors are handled by the status poller below
    });
  }, [id, phase]);

  // Poll /api/plan-status/[id] every 2 seconds
  useEffect(() => {
    if (!id) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/plan-status/${id}`);
        if (!res.ok) return;

        const data = await res.json();

        // When waiting for full plan, ignore stale outline_ready status from the
        // previous phase — only update progress/message once full generation has started
        const isFullPhaseStatus = data.phase === "generating_full" || data.phase === "complete" || data.phase === "error";
        if (phase === "full" && !isFullPhaseStatus) return;

        setProgress(data.progress ?? 0);
        if (data.message) setApiMessage(data.message);

        if (data.phase === "error") {
          setError(data.message || "Something went wrong. Please contact support.");
          return;
        }

        if (phase === "outline" && data.phase === "outline_ready") {
          setIsDone(true);
          router.replace(`/outline/${id}`);
          return;
        }
        if (phase === "full" && data.phase === "complete") {
          setIsDone(true);
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

        {/* Heading — hidden until phase is resolved to avoid outline→full flash */}
        <h1 className="text-xl font-bold text-[#2d2d2d] mb-1">
          {!phaseReady ? "\u00A0" : phase === "full" ? "Your plan is being written..." : "Shaping your outline..."}
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

        {/* Time estimate + live elapsed counter */}
        <div className="text-xs text-[#b0aba6] space-y-1">
          <p>{estimatedTime}</p>
          <p className="tabular-nums">
            {elapsed < 10
              ? `${elapsed}s elapsed — still working, hang tight!`
              : elapsed < 60
              ? `${elapsed}s elapsed — almost there...`
              : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed — wrapping up the final touches...`}
          </p>
        </div>

        {/* Taking too long — show start-over option after 4 minutes */}
        {elapsed > 240 && !isDone && (
          <div className="mt-6 w-full bg-[#fff8f0] border border-[#f0d9c0] rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-[#8a6040] mb-1">Taking longer than expected</p>
            <p className="text-xs text-[#b08060] mb-3">
              Something may have gone wrong. You can wait a little longer or start fresh.
            </p>
            <a
              href="/profile"
              className="inline-block text-xs font-semibold text-white bg-[#c47a40] hover:bg-[#a86030] px-4 py-2 rounded-lg transition-colors"
            >
              Start over
            </a>
          </div>
        )}

        {/* Email notification opt-in — only show during full plan generation while still running */}
        {phase === "full" && !isDone && (
          <div className="mt-8 w-full bg-white rounded-2xl border border-[#e8e4e0] p-5 text-left">
            <p className="text-sm font-semibold text-[#2d2d2d] mb-1">
              📬 Email me when my plan is ready
            </p>
            <p className="text-xs text-[#8a8580] mb-3">
              Close this tab and we&apos;ll send you a link when it&apos;s done.
            </p>
            {notifyStatus === "sent" ? (
              <p className="text-sm text-[#5b8f8a] font-medium">
                ✓ Got it! We&apos;ll email you at <strong>{notifyEmail}</strong> when it&apos;s ready.
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 text-sm border border-[#e8e4e0] rounded-lg px-3 py-2 focus:outline-none focus:border-[#5b8f8a] text-[#2d2d2d]"
                />
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/request-plan-notification", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sessionId: id, email: notifyEmail }),
                      });
                      if (res.ok) {
                        setNotifyStatus("sent");
                      } else {
                        setNotifyStatus("error");
                      }
                    } catch {
                      setNotifyStatus("error");
                    }
                  }}
                  disabled={!notifyEmail}
                  className="bg-[#5b8f8a] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#3d6e69] transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  Notify me
                </button>
              </div>
            )}
            {notifyStatus === "error" && (
              <p className="text-xs text-red-500 mt-1">Something went wrong. Please try again.</p>
            )}
          </div>
        )}
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
