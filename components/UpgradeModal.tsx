/**
 * UpgradeModal
 *
 * Shown when a free-tier user has used all 4 of their free plans.
 * Smooth upsell — not a hard block. Offers monthly and annual upgrade paths.
 *
 * Usage:
 *   <UpgradeModal
 *     isOpen={showUpgrade}
 *     onClose={() => setShowUpgrade(false)}
 *     plansUsed={4}
 *   />
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  plansUsed?: number;
}

export function UpgradeModal({ isOpen, onClose, plansUsed = 4 }: UpgradeModalProps) {
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "annual" | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  async function handleUpgrade(plan: "monthly" | "annual") {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        // Fall back to pricing page on error
        router.push("/pricing");
      }
    } catch {
      router.push("/pricing");
    }
  }

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8a8580] hover:text-[#2d2d2d] transition-colors"
          aria-label="Close"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-[#edf5f4] flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-[#5b8f8a]" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-[#2d2d2d] mb-2">
          You&apos;ve used all {plansUsed} free plans
        </h2>
        <p className="text-[#8a8580] mb-6">
          Ready to keep going? Upgrade for unlimited personalized homeschool plans — no limits, ever.
        </p>

        {/* Upgrade options */}
        <div className="space-y-3 mb-6">
          {/* Annual — highlight first */}
          <button
            onClick={() => handleUpgrade("annual")}
            disabled={checkoutLoading !== null}
            className="w-full py-3 px-5 bg-[#5b8f8a] hover:bg-[#4a7b76] text-white rounded-xl font-semibold flex items-center justify-between transition-colors disabled:opacity-60"
          >
            <span>Annual — $149/yr</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {checkoutLoading === "annual" ? "Redirecting…" : "Best Value — save 35%"}
            </span>
          </button>

          <button
            onClick={() => handleUpgrade("monthly")}
            disabled={checkoutLoading !== null}
            className="w-full py-3 px-5 border-2 border-[#5b8f8a] text-[#5b8f8a] hover:bg-[#edf5f4] rounded-xl font-semibold flex items-center justify-between transition-colors disabled:opacity-60"
          >
            <span>Monthly — $19/mo</span>
            <span className="text-xs text-[#8a8580]">
              {checkoutLoading === "monthly" ? "Redirecting…" : "Cancel anytime"}
            </span>
          </button>
        </div>

        {/* View full pricing page */}
        <a
          href="/pricing"
          className="block text-center text-sm text-[#8a8580] hover:text-[#5b8f8a] transition-colors"
        >
          View full pricing details →
        </a>
      </div>
    </div>
  );
}

/**
 * UpgradeBanner
 *
 * Inline banner shown on the profile/dashboard when user is near or at their
 * free plan limit. Less intrusive than the modal — just a gentle nudge.
 */
export function UpgradeBanner({ plansUsed, limit = 4 }: { plansUsed: number; limit?: number }) {
  const plansLeft = Math.max(0, limit - plansUsed);

  if (plansLeft > 1) return null; // Only show when 1 or fewer plans remaining

  return (
    <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm ${
      plansLeft === 0
        ? "bg-amber-50 border border-amber-200 text-amber-800"
        : "bg-[#edf5f4] border border-[#c8dedd] text-[#3d6e6a]"
    }`}>
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>
        {plansLeft === 0
          ? "You've used all your free plans."
          : `${plansLeft} free plan remaining.`}
        {" "}
        <a href="/pricing" className="font-semibold underline hover:no-underline">
          Upgrade for unlimited access →
        </a>
      </span>
    </div>
  );
}
