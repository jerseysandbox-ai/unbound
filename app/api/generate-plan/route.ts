/**
 * POST /api/generate-plan
 *
 * Verifies the Stripe PaymentIntent succeeded, then runs the multi-agent
 * plan generation pipeline. Stores the result in Vercel KV with a 24h TTL.
 *
 * Body: { paymentIntentId: string, profile: ChildProfile }
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";
import { generatePlan } from "@/lib/agents";
import type { ChildProfile } from "@/app/profile/page";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// 24 hours in seconds
const KV_TTL_SECONDS = 86400;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentIntentId, profile } = body as {
      paymentIntentId: string;
      profile: ChildProfile;
    };

    if (!paymentIntentId || !profile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // ── Verify payment succeeded with Stripe ────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment has not been completed" },
        { status: 402 }
      );
    }

    // ── Check if plan was already generated (idempotency) ───────────────────
    const existingPlan = await kv.get(`plan:${paymentIntentId}`);
    if (existingPlan) {
      // Plan already exists — return success without re-generating
      return NextResponse.json({ success: true, cached: true });
    }

    // ── Run multi-agent plan generation ────────────────────────────────────
    const generatedPlan = await generatePlan(profile);

    // ── Store in KV with 24h TTL ────────────────────────────────────────────
    await kv.set(`plan:${paymentIntentId}`, generatedPlan, {
      ex: KV_TTL_SECONDS,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[generate-plan] Error:", err);
    return NextResponse.json(
      { error: "Plan generation failed. Please contact support." },
      { status: 500 }
    );
  }
}
