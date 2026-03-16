/**
 * POST /api/generate-full-plan
 *
 * Phase 2 of plan generation. Retrieves the stored outline from KV, runs the
 * full 9-agent pipeline (Sage brief already stored → 7 specialists → Architect),
 * updating status progressively as each agent completes.
 *
 * Body: { paymentIntentId: string, feedback?: string }
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";
import { generateFullPlan } from "@/lib/agents";
import type { GeneratedOutline } from "@/lib/agents";
import type { ChildProfile } from "@/app/profile/page";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// Max characters allowed in parent feedback before truncation — prevents
// prompt injection and runaway token costs
const MAX_FEEDBACK_CHARS = 500;

// 5-minute timeout — full pipeline with 7 parallel specialists + Architect
export const maxDuration = 300;

// 24 hours in seconds
const KV_TTL = 86400;

// Shape of what we stored in phase 1
interface StoredOutline {
  childBrief: string;
  subjects: GeneratedOutline["subjects"];
  generatedAt: string;
  profile: { childName: string };
  fullProfile: ChildProfile;
}

export async function POST(request: Request) {
  // Parse body up front so we can reference paymentIntentId in error handler
  let paymentIntentId: string | undefined;
  let feedback: string | undefined;

  try {
    const body = await request.json();
    paymentIntentId = body.paymentIntentId;
    // Truncate feedback to prevent prompt injection and token blowout
    feedback = body.feedback
      ? String(body.feedback).slice(0, MAX_FEEDBACK_CHARS)
      : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
    }

    // ── Re-verify payment with Stripe before running expensive pipeline ──────
    // Critical: prevents free plan generation by anyone who has a paymentIntentId
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment has not been completed" },
        { status: 402 }
      );
    }

    // ── Retrieve stored outline ──────────────────────────────────────────────
    const storedOutline = await kv.get<StoredOutline>(`outline:${paymentIntentId}`);
    if (!storedOutline) {
      return NextResponse.json(
        { error: "Outline not found. Please generate the outline first." },
        { status: 404 }
      );
    }

    // ── Idempotency: skip if plan already exists ─────────────────────────────
    const existingPlan = await kv.get(`plan:${paymentIntentId}`);
    if (existingPlan) {
      return NextResponse.json({ success: true, cached: true });
    }

    // ── Set status to generating_full ────────────────────────────────────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "generating_full", progress: 5, message: "Sage is setting the tone for the day..." },
      { ex: KV_TTL }
    );

    // Reconstruct the outline object expected by generateFullPlan
    const outline: GeneratedOutline = {
      childBrief: storedOutline.childBrief,
      subjects: storedOutline.subjects,
      generatedAt: storedOutline.generatedAt,
      profile: storedOutline.fullProfile,
    };

    // ── Run full pipeline with progress callbacks ────────────────────────────
    const generatedPlan = await generateFullPlan(
      outline,
      feedback || undefined,
      async (step: string, progress: number) => {
        // Update KV status as each specialist completes — polling page reads this
        await kv.set(
          `status:${paymentIntentId}`,
          { phase: "generating_full", progress, message: step, currentStep: step },
          { ex: KV_TTL }
        );
      }
    );

    // ── Store completed plan in KV ───────────────────────────────────────────
    // Store plan content + first name only — no sensitive profile data
    const safeStoredPlan = {
      plan: generatedPlan.plan,
      childBrief: generatedPlan.childBrief,
      agentOutputs: generatedPlan.agentOutputs,
      quote: generatedPlan.quote ?? null,
      generatedAt: generatedPlan.generatedAt,
      profile: { childName: generatedPlan.profile.childName },
    };
    await kv.set(`plan:${paymentIntentId}`, safeStoredPlan, { ex: KV_TTL });

    // ── Mark complete ────────────────────────────────────────────────────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "complete", progress: 100, message: "Your plan is ready!" },
      { ex: KV_TTL }
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[generate-full-plan] Error:", err);

    // Update status to error so the polling page can surface it to the user.
    // paymentIntentId is already parsed from the body above — no re-read needed.
    if (paymentIntentId) {
      try {
        await kv.set(
          `status:${paymentIntentId}`,
          { phase: "error", progress: 0, message: "Something went wrong. Please contact support." },
          { ex: KV_TTL }
        );
      } catch { /* best-effort — don't mask the original error */ }
    }

    return NextResponse.json(
      { error: "Plan generation failed. Please contact support." },
      { status: 500 }
    );
  }
}
