"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// Load Stripe once outside component to avoid re-instantiation
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutPage() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Pull PaymentIntent details stored during profile step
    const secret = sessionStorage.getItem("unbound_pi_secret");
    const piId = sessionStorage.getItem("unbound_pi_id");
    const profile = sessionStorage.getItem("unbound_profile");

    // If session is missing, send back to profile
    if (!secret || !piId || !profile) {
      router.replace("/profile");
      return;
    }

    setClientSecret(secret);
    setPaymentIntentId(piId);
  }, [router]);

  if (!clientSecret || !paymentIntentId) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
        <p className="text-[#8a8580]">Loading checkout…</p>
      </main>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#5b8f8a",
        colorBackground: "#faf9f6",
        borderRadius: "8px",
      },
    },
  };

  return (
    <main className="min-h-screen bg-[#faf9f6] px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <a href="/" className="text-[#5b8f8a] font-semibold text-lg">
            Unbound
          </a>
          <h1 className="text-3xl font-bold text-[#2d2d2d] mt-4 mb-2">
            Almost there
          </h1>
          <p className="text-[#8a8580]">
            One-time payment of <strong>$9</strong>. Your plan generates
            immediately after checkout.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4e0] p-6">
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm paymentIntentId={paymentIntentId} />
          </Elements>
        </div>
      </div>
    </main>
  );
}

function CheckoutForm({ paymentIntentId }: { paymentIntentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // Confirm the payment with Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setError("Payment did not complete. Please try again.");
      setProcessing(false);
      return;
    }

    // Payment succeeded — now trigger plan generation
    const profile = sessionStorage.getItem("unbound_profile");
    if (!profile) {
      setError("Session expired. Please start over.");
      setProcessing(false);
      return;
    }

    try {
      // Phase 1: Generate outline (Sage + Planner only — fast ~15s)
      // Full plan generation happens after parent reviews the outline
      const res = await fetch("/api/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId,
          profile: JSON.parse(profile),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Outline generation failed");
      }

      // Clean up session data
      sessionStorage.removeItem("unbound_profile");
      sessionStorage.removeItem("unbound_pi_secret");
      sessionStorage.removeItem("unbound_pi_id");
      sessionStorage.removeItem("unbound_turnstile");

      // Navigate to outline waiting page (phase=outline)
      router.push(`/generating/${paymentIntentId}?phase=outline`);
    } catch (err: unknown) {
      // Payment succeeded but outline generation failed — show recovery message
      setError(
        `Your payment was successful but we hit an error generating your plan. ` +
        `Please email support@unboundlearn.co with reference ID: ${paymentIntentId} ` +
        `and we'll get your plan to you right away.`
      );
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Order summary */}
      <div className="bg-[#e8f4f3] rounded-xl px-4 py-3 flex justify-between items-center">
        <span className="text-[#2d2d2d] font-medium">
          Personalized Daily Lesson Plan
        </span>
        <span className="text-[#5b8f8a] font-bold text-lg">$9</span>
      </div>

      <PaymentElement />

      {error && (
        <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#5b8f8a] hover:bg-[#3d6e69] disabled:opacity-60 text-white font-semibold text-lg py-4 rounded-xl transition-colors"
      >
        {processing ? "Processing…" : "Pay $9 & Get My Plan"}
      </button>

      <p className="text-center text-xs text-[#8a8580]">
        Secured by Stripe. We never store your card details.
      </p>
    </form>
  );
}
