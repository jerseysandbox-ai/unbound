/**
 * /pricing
 *
 * Clean, mobile-responsive pricing page showing the 3 tiers:
 *   Free (4 plans) | Monthly ($19/mo) | Annual ($149/yr — "Best Value")
 *
 * Handles subscription checkout by posting to /api/create-checkout-session
 * and redirecting to the returned Stripe Checkout URL.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserData {
  subscription_status: string | null;
  subscription_plan: string | null;
  plans_used: number;
}

// ── Checkmark icon ────────────────────────────────────────────────────────────

function Check() {
  return (
    <svg
      className="w-5 h-5 text-[#5b8f8a] flex-shrink-0"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load current user subscription status
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("unbound_users")
          .select("subscription_status, subscription_plan, plans_used")
          .eq("id", user.id)
          .single();
        setUserData(data);
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  // Kick off Stripe Checkout for a paid plan
  async function handleUpgrade(plan: "monthly" | "annual") {
    setCheckoutLoading(plan);
    setError(null);

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        // Not logged in — send to signup with redirect back
        router.push(`/signup?redirect=/pricing`);
        return;
      }

      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setCheckoutLoading(null);
    }
  }

  // Determine if a plan is the user's current plan
  function isCurrentPlan(plan: "free" | "monthly" | "annual"): boolean {
    if (!userData) return false;
    if (plan === "free") {
      return userData.subscription_status === "free" || userData.subscription_status === null;
    }
    return (
      userData.subscription_status === "active" && userData.subscription_plan === plan
    );
  }

  const isSubscribed = userData?.subscription_status === "active";
  const plansUsed = userData?.plans_used ?? 0;
  const freePlansLeft = Math.max(0, 4 - plansUsed);

  return (
    <main className="min-h-screen bg-[#faf9f6] px-4 py-12">
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-12">
        <a href="/" className="text-[#5b8f8a] font-semibold text-lg block mb-6">
          Unbound
        </a>
        <h1 className="text-4xl font-bold text-[#2d2d2d] mb-4">
          Simple, honest pricing
        </h1>
        <p className="text-[#8a8580] text-lg max-w-xl mx-auto">
          Generate personalized homeschool plans in minutes. Start free, upgrade when you&apos;re ready.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── Free Tier ─────────────────────────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${
          isCurrentPlan("free") ? "border-[#5b8f8a]" : "border-[#e8e4e0]"
        }`}>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-[#2d2d2d]">Free</h2>
              {isCurrentPlan("free") && (
                <span className="text-xs font-semibold bg-[#edf5f4] text-[#5b8f8a] px-2 py-1 rounded-full">
                  Current Plan
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#2d2d2d]">$0</span>
              <span className="text-[#8a8580]">/ forever</span>
            </div>
            <p className="text-[#8a8580] text-sm mt-2">No card required</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {[
              "4 complete homeschool plans",
              "All grade levels (K–12)",
              "Full AI-generated activities",
              "PDF download",
              "No credit card needed",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#5a5550]">
                <Check />
                {f}
              </li>
            ))}
          </ul>

          {/* Show plans remaining for free users */}
          {!loading && isCurrentPlan("free") && (
            <p className="text-xs text-[#8a8580] text-center mb-3">
              {freePlansLeft} of 4 free plans remaining
            </p>
          )}

          <a
            href={loading ? "#" : (userData ? "/profile" : "/signup")}
            className="block text-center py-3 px-6 rounded-xl border-2 border-[#5b8f8a] text-[#5b8f8a] font-semibold hover:bg-[#edf5f4] transition-colors"
          >
            {userData ? "Go to Dashboard" : "Get Started Free"}
          </a>
        </div>

        {/* ── Monthly Tier ──────────────────────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 p-6 flex flex-col ${
          isCurrentPlan("monthly") ? "border-[#5b8f8a]" : "border-[#e8e4e0]"
        }`}>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-[#2d2d2d]">Monthly</h2>
              {isCurrentPlan("monthly") && (
                <span className="text-xs font-semibold bg-[#edf5f4] text-[#5b8f8a] px-2 py-1 rounded-full">
                  Current Plan
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#2d2d2d]">$19</span>
              <span className="text-[#8a8580]">/ month</span>
            </div>
            <p className="text-[#8a8580] text-sm mt-2">Cancel anytime</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {[
              "Unlimited homeschool plans",
              "All grade levels (K–12)",
              "Full AI-generated activities",
              "PDF download",
              "Priority generation speed",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#5a5550]">
                <Check />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => !isSubscribed && handleUpgrade("monthly")}
            disabled={checkoutLoading !== null || isSubscribed || loading}
            className={`w-full py-3 px-6 rounded-xl font-semibold transition-colors ${
              isCurrentPlan("monthly")
                ? "bg-[#edf5f4] text-[#5b8f8a] cursor-default"
                : isSubscribed
                ? "bg-[#f0eeeb] text-[#8a8580] cursor-default"
                : "bg-[#5b8f8a] text-white hover:bg-[#4a7b76] disabled:opacity-60"
            }`}
          >
            {loading
              ? "Loading…"
              : checkoutLoading === "monthly"
              ? "Redirecting…"
              : isCurrentPlan("monthly")
              ? "Current Plan"
              : isSubscribed
              ? "Subscribed"
              : "Subscribe Monthly"}
          </button>
        </div>

        {/* ── Annual Tier ───────────────────────────────────────────────────── */}
        <div className={`bg-white rounded-2xl border-2 p-6 flex flex-col relative overflow-hidden ${
          isCurrentPlan("annual") ? "border-[#5b8f8a]" : "border-[#5b8f8a]"
        }`}>
          {/* Best Value badge */}
          <div className="absolute top-0 right-0 bg-[#5b8f8a] text-white text-xs font-bold px-3 py-1 rounded-bl-xl">
            Best Value
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-[#2d2d2d]">Annual</h2>
              {isCurrentPlan("annual") && (
                <span className="text-xs font-semibold bg-[#edf5f4] text-[#5b8f8a] px-2 py-1 rounded-full">
                  Current Plan
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-[#2d2d2d]">$149</span>
              <span className="text-[#8a8580]">/ year</span>
            </div>
            <p className="text-[#5b8f8a] text-sm font-medium mt-2">
              Save ~35% vs monthly ($12.42/mo)
            </p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {[
              "Unlimited homeschool plans",
              "All grade levels (K–12)",
              "Full AI-generated activities",
              "PDF download",
              "Priority generation speed",
              "Best value for year-round use",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-[#5a5550]">
                <Check />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => !isSubscribed && handleUpgrade("annual")}
            disabled={checkoutLoading !== null || isSubscribed || loading}
            className={`w-full py-3 px-6 rounded-xl font-semibold transition-colors ${
              isCurrentPlan("annual")
                ? "bg-[#edf5f4] text-[#5b8f8a] cursor-default"
                : isSubscribed
                ? "bg-[#f0eeeb] text-[#8a8580] cursor-default"
                : "bg-[#5b8f8a] text-white hover:bg-[#4a7b76] disabled:opacity-60"
            }`}
          >
            {loading
              ? "Loading…"
              : checkoutLoading === "annual"
              ? "Redirecting…"
              : isCurrentPlan("annual")
              ? "Current Plan"
              : isSubscribed
              ? "Subscribed"
              : "Subscribe Annually"}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-md mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* FAQ / trust section */}
      <div className="max-w-xl mx-auto mt-16 text-center text-sm text-[#8a8580] space-y-2">
        <p>Payments are processed securely by Stripe. Cancel anytime from your account settings.</p>
        <p>Questions? Reach us at <a href="mailto:hello@unboundlearner.com" className="text-[#5b8f8a] hover:underline">hello@unboundlearner.com</a></p>
      </div>
    </main>
  );
}
