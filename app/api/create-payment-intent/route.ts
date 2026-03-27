/**
 * POST /api/create-payment-intent
 *
 * Verifies Cloudflare Turnstile token server-side, then creates a Stripe
 * PaymentIntent for $9. Returns clientSecret + paymentIntentId to the client.
 */


export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY!;
const PLAN_PRICE_CENTS = 900; // $9.00

export async function POST(request: Request) {
  try {
    const { turnstileToken } = await request.json();

    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Missing security token" },
        { status: 400 }
      );
    }

    // ── Verify Turnstile token ──────────────────────────────────────────────
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
        }),
      }
    );

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return NextResponse.json(
        { error: "Security check failed. Please try again." },
        { status: 403 }
      );
    }

    // ── Create Stripe PaymentIntent ─────────────────────────────────────────
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: PLAN_PRICE_CENTS,
      currency: "usd",
      description: "Unbound: Personalized Daily Lesson Plan",
      metadata: {
        product: "unbound_plan_v0",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: unknown) {
    console.error("[create-payment-intent] Error:", err);
    return NextResponse.json(
      { error: "Failed to create payment. Please try again." },
      { status: 500 }
    );
  }
}
