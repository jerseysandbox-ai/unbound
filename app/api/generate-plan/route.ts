/**
 * POST /api/generate-plan
 *
 * Verifies the Stripe PaymentIntent succeeded, then runs the multi-agent
 * plan generation pipeline. Stores the result in Vercel KV with a 24h TTL.
 *
 * Body: { paymentIntentId: string, profile: ChildProfile }
 */


export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Extend Vercel function timeout to 5 minutes — multi-agent pipeline takes 50–75s
export const maxDuration = 300;
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
    // Only store plan content + child's first name for display — never store
    // diagnosis, challenges, or other sensitive profile fields in KV
    const safeStoredPlan = {
      plan: generatedPlan.plan,
      childBrief: generatedPlan.childBrief,
      agentOutputs: generatedPlan.agentOutputs,
      generatedAt: generatedPlan.generatedAt,
      profile: { childName: generatedPlan.profile.childName }, // first name only
    };
    await kv.set(`plan:${paymentIntentId}`, safeStoredPlan, {
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
