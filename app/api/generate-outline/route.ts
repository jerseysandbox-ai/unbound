/**
 * POST /api/generate-outline
 *
 * Phase 1 of plan generation. Verifies Stripe payment, runs Sage + Planner
 * to produce a structured outline (no full activities). Stores outline and
 * initial status in KV. Does NOT run the 7 specialists.
 *
 * Body: { paymentIntentId: string, profile: ChildProfile }
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";
import { generateOutline } from "@/lib/agents";
import type { ChildProfile } from "@/app/profile/page";

// Extend timeout — Sage + Planner takes ~15s but give headroom
export const maxDuration = 120;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// 24 hours in seconds
const KV_TTL = 86400;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { paymentIntentId, profile } = body as {
      paymentIntentId: string;
      profile: ChildProfile;
    };

    if (!paymentIntentId || !profile) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Verify payment succeeded ─────────────────────────────────────────────
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment has not been completed" }, { status: 402 });
    }

    // ── Idempotency: if outline already exists, skip re-generation ───────────
    const existingOutline = await kv.get(`outline:${paymentIntentId}`);
    if (existingOutline) {
      return NextResponse.json({ success: true, cached: true });
    }

    // ── Set status to "generating" so the polling page shows progress ────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "generating_outline", progress: 10, message: "Sage is reviewing your learner profile..." },
      { ex: KV_TTL }
    );

    // ── Run Sage + Planner ───────────────────────────────────────────────────
    const outline = await generateOutline(profile);

    // ── Store outline in KV (profile stripped to first name for privacy) ─────
    const safeOutline = {
      childBrief: outline.childBrief,
      subjects: outline.subjects,
      generatedAt: outline.generatedAt,
      profile: { childName: outline.profile.childName },
      // Store full profile for use in phase 2 (still under paymentIntentId — not shared)
      fullProfile: profile,
    };
    await kv.set(`outline:${paymentIntentId}`, safeOutline, { ex: KV_TTL });

    // ── Update status to outline_ready ───────────────────────────────────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "outline_ready", progress: 100, message: "Your outline is ready!" },
      { ex: KV_TTL }
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[generate-outline] Error:", err);
    return NextResponse.json(
      { error: "Outline generation failed. Please contact support." },
      { status: 500 }
    );
  }
}
