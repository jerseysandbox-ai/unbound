"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// Dynamically import Turnstile so it only loads client-side (no SSR)
const TurnstileWidget = dynamic(() => import("@/components/TurnstileWidget"), {
  ssr: false,
});

export interface ChildProfile {
  childName: string;
  age: string;
  diagnosis: string;
  interests: string;
  academicLevel: string;
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

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ChildProfile>({
    childName: "",
    age: "",
    diagnosis: "",
    interests: "",
    academicLevel: "",
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
      "age",
      "diagnosis",
      "interests",
      "academicLevel",
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
      // Store profile in sessionStorage and move to checkout
      // (profile will be sent server-side only after payment succeeds)
      sessionStorage.setItem("unbound_profile", JSON.stringify(form));
      sessionStorage.setItem("unbound_turnstile", turnstileToken);

      // Create Stripe PaymentIntent server-side before redirecting
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
            Tell us about your child
          </h1>
          <p className="text-[#8a8580]">
            The more detail you share, the better the plan. Takes about 3
            minutes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-[#e8e4e0] p-6 space-y-5"
        >
          {/* Child's name */}
          <Field label="Child's first name" required>
            <input
              name="childName"
              value={form.childName}
              onChange={handleChange}
              placeholder="e.g. Maya"
              className={inputClass}
            />
          </Field>

          {/* Age */}
          <Field label="Age" required>
            <input
              name="age"
              value={form.age}
              onChange={handleChange}
              placeholder="e.g. 9"
              className={inputClass}
            />
          </Field>

          {/* Diagnosis */}
          <Field
            label="Diagnosis / neurodivergent profile"
            hint="Free text — be as specific or general as you like"
            required
          >
            <textarea
              name="diagnosis"
              value={form.diagnosis}
              onChange={handleChange}
              placeholder='e.g. "ADHD and anxiety", "PANS/PANDAS", "autism level 1 with PDA profile"'
              rows={3}
              className={textareaClass}
            />
          </Field>

          {/* Interests */}
          <Field
            label="Top 3 interests / what excites them"
            hint="This is how we hook them in"
            required
          >
            <textarea
              name="interests"
              value={form.interests}
              onChange={handleChange}
              placeholder="e.g. Minecraft, dinosaurs, drawing anime characters"
              rows={2}
              className={textareaClass}
            />
          </Field>

          {/* Academic level */}
          <Field
            label="Current academic level"
            hint="Grade equivalent or describe in your own words"
            required
          >
            <input
              name="academicLevel"
              value={form.academicLevel}
              onChange={handleChange}
              placeholder='e.g. "3rd grade math, 5th grade reading" or "behind in writing, ahead in science"'
              className={inputClass}
            />
          </Field>

          {/* Learning challenges */}
          <Field label="Biggest learning challenges" required>
            <textarea
              name="learningChallenges"
              value={form.learningChallenges}
              onChange={handleChange}
              placeholder="e.g. Struggles to start tasks, shuts down when frustrated, needs frequent breaks"
              rows={3}
              className={textareaClass}
            />
          </Field>

          {/* Session length */}
          <Field label="Session length available today" required>
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
            label="One thing you want to focus on today"
            hint="Your priority — what matters most right now"
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
            One-time payment. No subscription. Plan generated immediately after
            checkout.
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
