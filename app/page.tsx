"use client";

/**
 * Home page — Unbound
 * Shows auth state in nav. Highlights free first plan prominently.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Subject icons — clean SVG line icons in brand teal ──────────────────────

const IconMath = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 10h12M10 4v12M5 5l10 10M15 5L5 15" />
  </svg>
);

const IconScience = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M7 3v7.5L3.5 16.5a1 1 0 00.9 1.5h11.2a1 1 0 00.9-1.5L13 10.5V3" />
    <path d="M7 3h6M5.5 14h9" />
    <circle cx="12" cy="13" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="8.5" cy="15" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

const IconLanguageArts = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 6h12M4 10h8M4 14h5" />
    <path d="M14 12l1.5 4M14 12l-1.5 4M13 15h3" />
  </svg>
);

const IconSocialStudies = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 2.5c0 0-3 3-3 7.5s3 7.5 3 7.5M10 2.5c0 0 3 3 3 7.5s-3 7.5-3 7.5M2.5 10h15" />
  </svg>
);

const IconSEL = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M10 17s-7-4.35-7-8.5a4.5 4.5 0 018.07-2.76A4.5 4.5 0 0117 8.5C17 12.65 10 17 10 17z" />
  </svg>
);

const IconArts = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="10" cy="10" r="7.5" />
    <circle cx="7.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12.5" cy="7" r="1" fill="currentColor" stroke="none" />
    <circle cx="14" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
    <path d="M10 18a2 2 0 002-2H8a2 2 0 002 2z" />
  </svg>
);

const IconEntrepreneurship = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M10 2.5v3M10 14.5v3M4.2 4.2l2.1 2.1M13.7 13.7l2.1 2.1M2.5 10h3M14.5 10h3M4.2 15.8l2.1-2.1M13.7 6.3l2.1-2.1" />
    <circle cx="10" cy="10" r="3" />
  </svg>
);

const IconPacing = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 6v4l2.5 2.5" />
  </svg>
);

// Book icon for Book Companion card
const IconBook = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M4 3h9a2 2 0 012 2v11a2 2 0 01-2 2H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
    <path d="M15 14h1a1 1 0 001-1V5a1 1 0 00-1-1h-1" />
    <path d="M7 7h5M7 10h5M7 13h3" />
  </svg>
);

// Sparkle icon for Book Recommendations card
const IconSparkle = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
    <circle cx="10" cy="10" r="3" />
  </svg>
);

const PLAN_SUBJECTS = [
  { icon: <IconMath />, label: "Math" },
  { icon: <IconScience />, label: "Science" },
  { icon: <IconLanguageArts />, label: "Language Arts" },
  { icon: <IconSocialStudies />, label: "Social Studies" },
  { icon: <IconSEL />, label: "SEL + Life Skills" },
  { icon: <IconArts />, label: "Arts & Creative Expression" },
  { icon: <IconEntrepreneurship />, label: "Entrepreneurship" },
  { icon: <IconPacing />, label: "Pacing built around your child" },
];

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
        <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mb-6">
          {/* Line 1 — dark */}
          <span className="block text-[#2d2d2d]">A lesson plan made</span>
          {/* Line 2 — teal, includes "just" */}
          <span className="block text-[#1a5c5a]">just for your child.</span>
        </h1>
        <p className="text-lg text-[#8a8580] mb-10 leading-relaxed">
          Tell us about your learner and get a full personalized daily plan
          built around their interests, their pace, and your goals for today.
        </p>

        <Link
          href={userEmail ? "/profile" : "/signup"}
          className="inline-block bg-[#5b8f8a] hover:bg-[#3d6e69] text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-colors shadow-sm"
        >
          {userEmail ? "Create Today's Plan" : "Get Started - First Plan Free"}
        </Link>
        <p className="mt-4 text-sm text-[#8a8580]">
          1 free plan · $19/month after · Cancel anytime
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
              desc: "Sign up in seconds. No credit card needed. Your first plan is on us.",
            },
            {
              step: "2",
              title: "Tell us about your learner",
              desc: "Share their grade level, interests, what they find tough, and what you want to focus on today.",
            },
            {
              step: "3",
              title: "Download your plan",
              desc: "Your plan arrives with lessons for every subject, tailored to your child's interests, pace, and today's goals.",
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
            Then <strong>$19/month</strong> or <strong>$149/year</strong> &nbsp;·&nbsp;
            Cancel anytime.
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
            {PLAN_SUBJECTS.map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3.5 shadow-sm border border-[#ddf0ee]"
              >
                <span className="text-[#5b8f8a] shrink-0 w-5 h-5">{icon}</span>
                <span className="text-[#2d2d2d] font-medium text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reading Tools section */}
      <section className="py-12 px-6 mt-2">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-[#2d2d2d] mb-2">
            Reading Tools
          </h2>
          <p className="text-center text-[#8a8580] text-sm mb-8">
            Support independent reading and discover what to read next.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Book Companion card */}
            <Link
              href="/book-companion"
              className="group flex flex-col gap-3 bg-white rounded-2xl px-5 py-5 shadow-sm border border-[#ddf0ee] hover:shadow-md hover:border-[#1a5c5a] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#1a5c5a] w-6 h-6 shrink-0">
                  <IconBook />
                </span>
                <span className="font-semibold text-[#2d2d2d] text-base">Book Companion</span>
              </div>
              <p className="text-sm text-[#8a8580] leading-relaxed">
                Chapter summaries, discussion questions with answers, and vocabulary for any book you are reading together.
              </p>
              <span className="text-xs font-semibold text-[#1a5c5a] group-hover:underline mt-auto">
                Generate a companion →
              </span>
            </Link>

            {/* Book Recommendations card */}
            <Link
              href="/book-recommendations"
              className="group flex flex-col gap-3 bg-white rounded-2xl px-5 py-5 shadow-sm border border-[#ddf0ee] hover:shadow-md hover:border-[#1a5c5a] transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-[#1a5c5a] w-6 h-6 shrink-0">
                  <IconSparkle />
                </span>
                <span className="font-semibold text-[#2d2d2d] text-base">Book Recommendations</span>
              </div>
              <p className="text-sm text-[#8a8580] leading-relaxed">
                6 personalized picks based on your reader&apos;s level, interests, and what you are studying.
              </p>
              <span className="text-xs font-semibold text-[#1a5c5a] group-hover:underline mt-auto">
                Get recommendations →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-[#2d2d2d] mb-4">
          Ready to try it?
        </h2>
        <p className="text-[#8a8580] mb-8">
          No subscription. Your first plan is free. Just create an account and go.
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
