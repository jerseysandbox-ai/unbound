/**
 * POST /api/generate-outline
 *
 * Phase 1 of plan generation. Verifies Stripe payment, runs Sage + Planner
 * to produce a structured outline (no full activities). Stores outline and
 * initial status in KV.
 *
 * Supports iterative regeneration: pass regenerate=true to bypass idempotency
 * and re-run with per-subject tweaks + global feedback.
 *
 * Body: {
 *   paymentIntentId: string,
 *   profile: ChildProfile,
 *   regenerate?: boolean,
 *   subjectTweaks?: { subject: string; feedback: string }[],
 *   globalFeedback?: string,
 * }
 *
 * Response:
 *   { success: true, cached?: true } when async
 *   { success: true, outline: OutlineData } when synchronous regeneration
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";
import { generateOutline } from "@/lib/agents";
import type { ChildProfile } from "@/app/profile/page";
import type { SubjectTweak } from "@/lib/agents";

// Extend timeout - Sage + Planner takes ~15s but give headroom
export const maxDuration = 120;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// 24 hours in seconds
const KV_TTL = 86400;

// Max characters for feedback fields
const MAX_FEEDBACK_CHARS = 500;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      paymentIntentId,
      profile,
      regenerate = false,
      subjectTweaks,
      globalFeedback,
    } = body as {
      paymentIntentId: string;
      profile: ChildProfile;
      regenerate?: boolean;
      subjectTweaks?: SubjectTweak[];
      globalFeedback?: string;
    };

    if (!paymentIntentId || !profile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Sanitize feedback to prevent prompt injection
    const safeTweaks = subjectTweaks?.map((t) => ({
      subject: String(t.subject).slice(0, 100),
      feedback: String(t.feedback).slice(0, MAX_FEEDBACK_CHARS),
    }));
    const safeGlobalFeedback = globalFeedback
      ? String(globalFeedback).slice(0, MAX_FEEDBACK_CHARS)
      : undefined;

    // ── Verify payment succeeded ─────────────────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment has not been completed" }, { status: 402 });
    }

    // ── Idempotency: if outline already exists and not regenerating, skip ────
    if (!regenerate) {
      const existingOutline = await kv.get(`outline:${paymentIntentId}`);
      if (existingOutline) {
        return NextResponse.json({ success: true, cached: true });
      }
    }

    // ── Set status to "generating" so the polling page shows progress ────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "generating_outline", progress: 10, message: "Sage is reading between the lines of your child's profile..." },
      { ex: KV_TTL }
    );

    // ── Run Sage + Planner (with optional feedback for regeneration) ─────────
    const outline = await generateOutline(profile, safeTweaks, safeGlobalFeedback);

    // ── Store outline in KV ──────────────────────────────────────────────────
    const safeOutline = {
      childBrief: outline.childBrief,
      subjects: outline.subjects,
      generatedAt: outline.generatedAt,
      profile: { childName: outline.profile.childName },
      // Full profile stored for phase 2 use (still gated behind paymentIntentId)
      fullProfile: profile,
    };
    await kv.set(`outline:${paymentIntentId}`, safeOutline, { ex: KV_TTL });

    // ── Update status to outline_ready ───────────────────────────────────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "outline_ready", progress: 100, message: "Your outline is ready!" },
      { ex: KV_TTL }
    );

    // For regeneration requests, return the outline data inline so the
    // outline page can update immediately without polling
    if (regenerate) {
      return NextResponse.json({
        success: true,
        outline: {
          subjects: outline.subjects,
          profile: { childName: outline.profile.childName },
          generatedAt: outline.generatedAt,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[generate-outline] Error:", err);
    return NextResponse.json(
      { error: "Outline generation failed. Please contact support." },
      { status: 500 }
    );
  }
}
