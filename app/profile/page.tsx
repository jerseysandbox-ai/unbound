"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import Turnstile so it only loads client-side (no SSR)
const TurnstileWidget = dynamic(() => import("@/components/TurnstileWidget"), {
  ssr: false,
});

export interface ChildProfile {
  // Layer 1 - Saved Learner Profile (persisted in localStorage)
  childName: string;
  gradeLevel: string;
  interests: string;
  learningChallenges: string;
  learningStyleNotes: string; // optional free text

  // Layer 2 - Today's Session (always fresh)
  sessionLength: string;
  focusToday: string;
  energyCheck: string;
}

// The subset stored in localStorage (Layer 1 only)
type SavedProfile = Pick<
  ChildProfile,
  "childName" | "gradeLevel" | "interests" | "learningChallenges" | "learningStyleNotes"
>;

const LS_KEY = "unbound_learner_profile";

// Safe localStorage read for SSR environments
function readSavedProfile(): SavedProfile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SavedProfile) : null;
  } catch {
    return null;
  }
}

// Safe localStorage write
function saveLearnerProfile(profile: SavedProfile): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(profile));
  } catch {
    // Silently ignore storage failures
  }
}

const SESSION_OPTIONS = [
  { value: "30min", label: "30 minutes" },
  { value: "1hour", label: "1 hour" },
  { value: "2hours", label: "2 hours" },
  { value: "halfday", label: "Half day (3-4 hours)" },
];

const ENERGY_OPTIONS = [
  { value: "ready", label: "Ready to go" },
  { value: "slow", label: "Slow start - ease in gently" },
  { value: "rough", label: "Rough day - keep it light" },
  { value: "hyper", label: "Hyper - need movement breaks" },
];

const GRADE_OPTIONS = [
  { value: "K", label: "Kindergarten" },
  { value: "1", label: "1st grade" },
  { value: "2", label: "2nd grade" },
  { value: "3", label: "3rd grade" },
  { value: "4", label: "4th grade" },
  { value: "5", label: "5th grade" },
  { value: "6", label: "6th grade" },
  { value: "7", label: "7th grade" },
  { value: "8", label: "8th grade" },
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade" },
  { value: "mixed", label: "Mixed / we don't use grade levels" },
];

export default function ProfilePage() {
  const router = useRouter();

  // Whether Layer 1 section is expanded for editing
  const [layer1Expanded, setLayer1Expanded] = useState(true);
  const [hasSavedProfile, setHasSavedProfile] = useState(false);

  const [form, setForm] = useState<ChildProfile>({
    childName: "",
    gradeLevel: "4",
    interests: "",
    learningChallenges: "",
    learningStyleNotes: "",
    sessionLength: "1hour",
    focusToday: "",
    energyCheck: "ready",
  });

  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // On mount, load saved Layer 1 profile from localStorage
  useEffect(() => {
    const saved = readSavedProfile();
    if (saved) {
      setHasSavedProfile(true);
      setLayer1Expanded(false); // Collapse Layer 1 on return visits
      setForm((prev) => ({
        ...prev,
        childName: saved.childName || prev.childName,
        gradeLevel: saved.gradeLevel || prev.gradeLevel,
        interests: saved.interests || prev.interests,
        learningChallenges: saved.learningChallenges || prev.learningChallenges,
        learningStyleNotes: saved.learningStyleNotes || prev.learningStyleNotes,
      }));
    }
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConsentError(false);

    if (!consentChecked) {
      setConsentError(true);
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the security check below.");
      return;
    }

    // Validate required fields
    const required: (keyof ChildProfile)[] = [
      "childName",
      "gradeLevel",
      "interests",
      "learningChallenges",
      "focusToday",
      "energyCheck",
    ];
    for (const field of required) {
      if (!form[field]?.trim()) {
        setError("Please fill in all required fields.");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Persist Layer 1 to localStorage for next visit
      saveLearnerProfile({
        childName: form.childName,
        gradeLevel: form.gradeLevel,
        interests: form.interests,
        learningChallenges: form.learningChallenges,
        learningStyleNotes: form.learningStyleNotes,
      });

      // Store full profile in sessionStorage for payment flow
      sessionStorage.setItem("unbound_profile", JSON.stringify(form));
      sessionStorage.setItem("unbound_turnstile", turnstileToken);

      // Create Stripe PaymentIntent server-side before redirecting to checkout
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnstileToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create payment");
      }

      const { clientSecret, paymentIntentId } = await res.json();
      sessionStorage.setItem("unbound_pi_id", paymentIntentId);
      sessionStorage.setItem("unbound_pi_secret", clientSecret);

      router.push("/checkout");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] px-4 py-10">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <a href="/" className="text-[#5b8f8a] font-semibold text-lg">
            Unbound
          </a>
          <h1 className="text-3xl font-bold text-[#2d2d2d] mt-4 mb-2">
            {hasSavedProfile ? `Welcome back` : "Tell us about your learner"}
          </h1>
          <p className="text-[#8a8580]">
            {hasSavedProfile
              ? "Your learner profile is saved. Just fill in today's details."
              : "The more detail you share, the better the plan. Takes about 3 minutes."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-[#e8e4e0] p-6 space-y-5"
        >
          {/* ── Layer 1: Saved Learner Profile ── */}
          <div className="border border-[#e8e4e0] rounded-xl overflow-hidden">
            {/* Layer 1 header - always visible */}
            <button
              type="button"
              onClick={() => setLayer1Expanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#f4f1ee] hover:bg-[#ece8e4] transition-colors text-left"
            >
              <div>
                <span className="text-sm font-semibold text-[#2d2d2d]">
                  Learner Profile
                </span>
                {hasSavedProfile && !layer1Expanded && (
                  <span className="ml-2 text-xs text-[#5b8f8a] font-medium bg-[#e8f4f3] px-2 py-0.5 rounded-full">
                    saved
                  </span>
                )}
                {hasSavedProfile && !layer1Expanded && (
                  <p className="text-xs text-[#8a8580] mt-0.5">
                    {form.childName} · {GRADE_OPTIONS.find(g => g.value === form.gradeLevel)?.label}
                  </p>
                )}
              </div>
              <span className="text-[#8a8580] text-sm">
                {layer1Expanded ? "▲ collapse" : "✎ edit"}
              </span>
            </button>

            {/* Layer 1 fields - collapsible */}
            {layer1Expanded && (
              <div className="p-4 space-y-4">
                {/* Nickname */}
                <Field
                  label="What do you call them at home?"
                  hint="A nickname is fine - whatever feels natural"
                  required
                >
                  <input
                    name="childName"
                    value={form.childName}
                    onChange={handleChange}
                    placeholder="e.g. Bug, Maya, Theo"
                    className={inputClass}
                  />
                </Field>

                {/* Grade level */}
                <Field label="Target grade level" required>
                  <select
                    name="gradeLevel"
                    value={form.gradeLevel}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {GRADE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Interests */}
                <Field
                  label="What are their top interests?"
                  hint="This is how we hook them in - the more specific, the better"
                  required
                >
                  <textarea
                    name="interests"
                    value={form.interests}
                    onChange={handleChange}
                    placeholder="e.g. Minecraft, dinosaurs, drawing anime characters, building things"
                    rows={2}
                    className={textareaClass}
                  />
                </Field>

                {/* Learning challenges */}
                <Field
                  label="What do they find tough?"
                  hint="Every kid has something - this helps us plan around it"
                  required
                >
                  <textarea
                    name="learningChallenges"
                    value={form.learningChallenges}
                    onChange={handleChange}
                    placeholder="e.g. Struggles to start tasks, shuts down when frustrated, needs frequent breaks, hates writing but loves talking"
                    rows={3}
                    className={textareaClass}
                  />
                </Field>

                {/* Learning style notes - optional */}
                <Field
                  label="Learning style notes"
                  hint="Optional - anything that helps us design better for them"
                >
                  <textarea
                    name="learningStyleNotes"
                    value={form.learningStyleNotes}
                    onChange={handleChange}
                    placeholder="e.g. Visual learner, hates worksheets, loves building things, needs movement breaks every 20 min"
                    rows={2}
                    className={textareaClass}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ── Layer 2: Today's Session ── */}
          <div>
            <p className="text-sm font-semibold text-[#2d2d2d] mb-3 px-1">
              Today&apos;s Session
            </p>
            <div className="space-y-4">
              {/* Session length */}
              <Field label="How much time do you have today?" required>
                <select
                  name="sessionLength"
                  value={form.sessionLength}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {SESSION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Focus today */}
              <Field
                label="What's your priority today?"
                hint="One thing you most want to accomplish or work on"
                required
              >
                <textarea
                  name="focusToday"
                  value={form.focusToday}
                  onChange={handleChange}
                  placeholder="e.g. She hasn't read in two weeks - I just want her excited about a book again"
                  rows={2}
                  className={textareaClass}
                />
              </Field>

              {/* Energy check */}
              <Field
                label="Energy check - how are they feeling right now?"
                required
              >
                <select
                  name="energyCheck"
                  value={form.energyCheck}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {ENERGY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Turnstile */}
          <div>
            <p className="text-sm text-[#8a8580] mb-1">Security check</p>
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken(null)}
            />
          </div>

          {/* Consent checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => {
                  setConsentChecked(e.target.checked);
                  if (e.target.checked) setConsentError(false);
                }}
                className="mt-0.5 h-4 w-4 rounded border-[#e0dbd5] accent-[#5b8f8a] cursor-pointer"
              />
              <span className="text-sm text-[#2d2d2d]">
                I agree to the{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#5b8f8a] underline hover:text-[#3d6e69]"
                >
                  Privacy Policy
                </a>{" "}
                and consent to my child&apos;s information being processed to generate a lesson plan.
              </span>
            </label>
            {consentError && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2 mt-2">
                You must agree to the Privacy Policy to continue.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#5b8f8a] hover:bg-[#3d6e69] disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors"
          >
            {submitting ? "Setting up..." : "Continue to Payment - $9"}
          </button>

          <p className="text-center text-xs text-[#8a8580]">
            One-time payment. No subscription. Plan generated immediately after checkout.
          </p>
        </form>
      </div>
    </main>
  );
}

// Reusable field wrapper
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#2d2d2d] mb-1">
        {label} {required && <span className="text-[#5b8f8a]">*</span>}
      </label>
      {hint && <p className="text-xs text-[#8a8580] mb-1">{hint}</p>}
      {children}
    </div>
  );
}

const inputClass =
  "w-full border border-[#e0dbd5] rounded-lg px-3 py-2.5 text-[#2d2d2d] bg-[#faf9f6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] text-sm";
const textareaClass = `${inputClass} resize-none`;
