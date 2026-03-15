"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import Turnstile so it only loads client-side (no SSR)
const TurnstileWidget = dynamic(() => import("@/components/TurnstileWidget"), {
  ssr: false,
});

export interface ChildProfile {
  childName: string;       // nickname — not necessarily legal name
  gradeLevel: string;      // grade level instead of age
  interests: string;
  learningChallenges: string;
  sessionLength: string;
  focusToday: string;
}

const SESSION_OPTIONS = [
  { value: "30min", label: "30 minutes" },
  { value: "1hour", label: "1 hour" },
  { value: "2hours", label: "2 hours" },
  { value: "halfday", label: "Half day (3–4 hours)" },
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
  const [form, setForm] = useState<ChildProfile>({
    childName: "",
    gradeLevel: "4",
    interests: "",
    learningChallenges: "",
    sessionLength: "1hour",
    focusToday: "",
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    ];
    for (const field of required) {
      if (!form[field].trim()) {
        setError("Please fill in all fields.");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Store profile in sessionStorage — sent server-side only after payment succeeds
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
            Tell us about your learner
          </h1>
          <p className="text-[#8a8580]">
            The more detail you share, the better the plan. Takes about 3 minutes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-[#e8e4e0] p-6 space-y-5"
        >
          {/* Nickname */}
          <Field
            label="What do you call them at home?"
            hint="A nickname is fine — whatever feels natural"
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
            hint="This is how we hook them in — the more specific, the better"
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
            hint="Every kid has something — this helps us plan around it"
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
            label="What's your priority for today?"
            hint="One thing you most want to accomplish or work on"
            required
          >
            <textarea
              name="focusToday"
              value={form.focusToday}
              onChange={handleChange}
              placeholder="e.g. She hasn't read in two weeks — I just want her excited about a book again"
              rows={2}
              className={textareaClass}
            />
          </Field>

          {/* Turnstile */}
          <div>
            <p className="text-sm text-[#8a8580] mb-1">Security check</p>
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken(null)}
            />
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
            {submitting ? "Setting up..." : "Continue to Payment — $9"}
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
