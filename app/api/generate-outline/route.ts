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


export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";
import { generateOutline } from "@/lib/agents";
import type { ChildProfile } from "@/app/profile/page";
import type { SubjectTweak } from "@/lib/agents";

// Extend timeout - Sage + Planner takes ~15s but give headroom
export const maxDuration = 120;

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

// 24 hours in seconds
const KV_TTL = 86400;

// Max characters for feedback fields
const MAX_FEEDBACK_CHARS = 500;

// ─── Sanitize profile fields before injecting into prompts ───────────────────
// Defense-in-depth against prompt injection via user-supplied profile data.
function sanitizeField(value: string | undefined, maxLength = 300): string {
  if (!value) return "";
  return value
    .slice(0, maxLength)
    .replace(/IGNORE/gi, "")
    .replace(/\[INST\]|\[\/INST\]|\[SYSTEM\]/gi, "")
    .replace(/<\|/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}

function sanitizeProfile(profile: ChildProfile): ChildProfile {
  return {
    ...profile,
    childName: sanitizeField(profile.childName, 50),
    interests: sanitizeField(profile.interests, 300),
    learningChallenges: sanitizeField(profile.learningChallenges, 300),
    focusToday: sanitizeField(profile.focusToday, 300),
    stateStandards: sanitizeField(profile.stateStandards, 300),
    homeState: sanitizeField(profile.homeState, 50),
    materialsNotes: sanitizeField(profile.materialsNotes, 300),
    learningStyleNotes: sanitizeField(profile.learningStyleNotes, 300),
    subjectGoals: (profile.subjectGoals ?? []).map((g) => ({
      subject: sanitizeField(g.subject, 50),
      focus: sanitizeField(g.focus, 200),
    })),
  };
}

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

    // For regeneration, profile can be omitted — we'll load it from KV below
    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!profile && !regenerate) {
      return NextResponse.json({ error: "Missing profile" }, { status: 400 });
    }

    // Sanitize feedback to prevent prompt injection
    const safeTweaks = subjectTweaks?.map((t) => ({
      subject: String(t.subject).slice(0, 100),
      feedback: String(t.feedback).slice(0, MAX_FEEDBACK_CHARS),
    }));
    const safeGlobalFeedback = globalFeedback
      ? String(globalFeedback).slice(0, MAX_FEEDBACK_CHARS)
      : undefined;

    // ── For regeneration: load profile from KV if not in request body ────────
    // This fixes the "Session expired" bug — the profile is always stored in
    // KV when the outline is first generated, so we never need sessionStorage.
    let resolvedProfile = profile;
    if (regenerate && !resolvedProfile) {
      const storedOutline = await kv.get<{ fullProfile?: ChildProfile }>(`outline:${paymentIntentId}`);
      if (!storedOutline?.fullProfile) {
        return NextResponse.json({ error: "Session not found. Please start a new plan." }, { status: 404 });
      }
      resolvedProfile = storedOutline.fullProfile;
    }

    // ── For free sessions: verify user still has free plans remaining ────────
    // Subscribers (subscription_status='active') skip this check entirely.
    if (paymentIntentId.startsWith("free_") && !regenerate) {
      const userId = await kv.get<string>(`free_user:${paymentIntentId}`);
      if (userId) {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase
          .from("unbound_users")
          .select("subscription_status, plans_used")
          .eq("id", userId)
          .single();

        const isSubscribed = userData?.subscription_status === "active";
        const plansUsed = userData?.plans_used ?? 0;
        const FREE_PLAN_LIMIT = 4;

        if (!isSubscribed && plansUsed >= FREE_PLAN_LIMIT) {
          return NextResponse.json(
            { error: "upgrade_required", upgradeUrl: "/pricing" },
            { status: 403 }
          );
        }
      }
    }

    // ── Verify payment succeeded (skip for free sessions) ────────────────────
    // Free sessions use a UUID prefix "free_" instead of a Stripe PI ID
    if (!paymentIntentId.startsWith("free_")) {
      const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json({ error: "Payment has not been completed" }, { status: 402 });
      }
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
    // Sanitize profile fields before injecting into agent prompts
    const outline = await generateOutline(sanitizeProfile(resolvedProfile!), safeTweaks, safeGlobalFeedback);

    // ── Store outline in KV ──────────────────────────────────────────────────
    // Determine userId for ownership checks (free sessions store it in KV, paid via Supabase auth)
    let outlineUserId: string | undefined;
    if (paymentIntentId.startsWith("free_")) {
      outlineUserId = (await kv.get<string>(`free_user:${paymentIntentId}`)) ?? undefined;
    } else {
      // For paid sessions, get userId from Supabase auth
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      outlineUserId = user?.id;
    }

    const safeOutline = {
      childBrief: outline.childBrief,
      subjects: outline.subjects,
      generatedAt: outline.generatedAt,
      profile: { childName: outline.profile.childName },
      // Full profile stored for phase 2 use and regeneration (never loses session)
      fullProfile: resolvedProfile,
      // userId stored for ownership verification in get-outline
      userId: outlineUserId,
    };
    await kv.set(`outline:${paymentIntentId}`, safeOutline, { ex: KV_TTL });
    // Also store profile separately so regeneration can always retrieve it
    await kv.set(`profile:${paymentIntentId}`, resolvedProfile, { ex: KV_TTL });

    // ── Update status to outline_ready ───────────────────────────────────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "outline_ready", progress: 100, message: "Your outline is ready!" },
      { ex: KV_TTL }
    );

    // ── For free sessions: increment plans_used counter ──────────────────────
    // We only increment on the outline step (phase 1) to count each unique plan.
    // Phase 2 (generate-full-plan) does NOT increment again to avoid double-counting.
    if (paymentIntentId.startsWith("free_") && !regenerate) {
      const userId = await kv.get<string>(`free_user:${paymentIntentId}`);
      if (userId) {
        // Import admin client inline to avoid circular deps
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminSupabase = createAdminClient();
        // Increment plans_used — free tier allows up to 4 total plans
        await adminSupabase.rpc("increment_plans_used", { user_id: userId });
      }
    }

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
