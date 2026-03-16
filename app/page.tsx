"use client";

/**
 * Home page — Unbound
 * Shows auth state in nav. Highlights free first plan prominently.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function HomePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  // Load auth state client-side
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      setAuthLoaded(true);
    });
    // Listen for sign-in/out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <span className="text-[#5b8f8a] font-semibold text-lg tracking-tight">
          Unbound
        </span>
        {/* Auth nav */}
        <div className="flex items-center gap-3 text-sm">
          {authLoaded && (
            userEmail ? (
              <>
                <span className="text-[#8a8580] hidden sm:inline">{userEmail}</span>
                <button
                  onClick={handleSignOut}
                  className="text-[#5b8f8a] font-medium hover:underline"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/login" className="text-[#5b8f8a] font-medium hover:underline">
                Sign in
              </Link>
            )
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 pt-12 pb-10 text-center">
        {/* Free plan badge */}
        <div className="inline-block bg-[#fef3c7] text-[#92400e] text-sm font-semibold px-4 py-1.5 rounded-full mb-4 border border-[#fde68a]">
          🎉 Your first plan is completely free
        </div>
        <div className="inline-block bg-[#e8f4f3] text-[#3d6e69] text-sm font-medium px-3 py-1 rounded-full mb-4 ml-2">
          Personalized homeschool plans, instantly
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-[#2d2d2d] leading-tight mb-6">
          A lesson plan made{" "}
          <span className="text-[#5b8f8a]">just for your child.</span>
        </h1>
        <p className="text-lg text-[#8a8580] mb-10 leading-relaxed">
          Tell us about your learner. Get a full personalized daily plan crafted
          by a team of AI specialists — built around their interests, their pace,
          and your goals for today.
        </p>

        <Link
          href={userEmail ? "/profile" : "/signup"}
          className="inline-block bg-[#5b8f8a] hover:bg-[#3d6e69] text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-sm"
        >
          {userEmail ? "Create Today's Plan" : "Get Started — First Plan Free"}
        </Link>
        <p className="mt-4 text-sm text-[#8a8580]">
          First plan free · Plan 2+ just $9 each · No subscription
        </p>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-center text-[#2d2d2d] mb-10">
          How it works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Create your free account",
              desc: "Sign up in seconds. No credit card needed — your first plan is on us.",
            },
            {
              step: "2",
              title: "Tell us about your learner",
              desc: "Share their grade level, interests, what they find tough, and what you want to focus on today.",
            },
            {
              step: "3",
              title: "Download your plan",
              desc: "9 specialized AI agents collaborate to create a warm, detailed daily plan with activities for every subject.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#e8f4f3] text-[#5b8f8a] font-bold text-lg flex items-center justify-center mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-[#2d2d2d] mb-2">{title}</h3>
              <p className="text-sm text-[#8a8580] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing callout */}
      <section className="max-w-2xl mx-auto px-6 py-4">
        <div className="bg-[#e8f4f3] rounded-2xl px-6 py-5 text-center">
          <p className="text-[#2d2d2d] font-semibold text-lg mb-1">Simple, honest pricing</p>
          <p className="text-[#5a5550] text-sm">
            First plan: <strong className="text-[#5b8f8a]">FREE</strong> &nbsp;·&nbsp;
            Plan 2+: <strong>$9 each</strong> &nbsp;·&nbsp;
            No subscription. No commitment.
          </p>
        </div>
      </section>

      {/* What's in the plan */}
      <section className="bg-[#e8f4f3] py-12 px-6 mt-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#2d2d2d] mb-8">
            What&apos;s in your plan
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: "📐", label: "Math" },
              { icon: "📖", label: "Science" },
              { icon: "✍️", label: "Language Arts" },
              { icon: "🌍", label: "Social Studies" },
              { icon: "❤️", label: "SEL + Life Skills" },
              { icon: "🎨", label: "Arts & Creative Expression" },
              { icon: "💡", label: "Entrepreneurship" },
              { icon: "🧠", label: "Pacing built around your child" },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
              >
                <span className="text-xl">{icon}</span>
                <span className="text-[#2d2d2d] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-[#2d2d2d] mb-4">
          Ready to try it?
        </h2>
        <p className="text-[#8a8580] mb-8">
          No subscription. Your first plan is free — just create an account and go.
        </p>
        <Link
          href={userEmail ? "/profile" : "/signup"}
          className="inline-block bg-[#5b8f8a] hover:bg-[#3d6e69] text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-sm"
        >
          {userEmail ? "Create Today's Plan" : "Get Started Free"}
        </Link>
      </section>

      <footer className="text-center text-xs text-[#8a8580] pb-8">
        © {new Date().getFullYear()} Unbound. Made with love for every kind of learner.{" "}
        ·{" "}
        <Link href="/privacy" className="hover:underline">
          Privacy Policy
        </Link>
      </footer>
    </main>
  );
}
