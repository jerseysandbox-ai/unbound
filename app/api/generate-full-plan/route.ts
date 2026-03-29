/**
 * POST /api/generate-full-plan
 *
 * Phase 2 of plan generation. Retrieves the stored outline from KV, runs the
 * full 9-agent pipeline (Sage brief already stored → 7 specialists → Architect),
 * updating status progressively as each agent completes.
 *
 * Body: { paymentIntentId: string, feedback?: string }
 */


export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { kv } from "@vercel/kv";
import { generateFullPlan } from "@/lib/agents";
import type { GeneratedOutline } from "@/lib/agents";
import type { ChildProfile } from "@/app/profile/page";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });
}

// Max characters allowed in parent feedback before truncation — prevents
// prompt injection and runaway token costs
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

    // ── Verify payment / free-plan legitimacy ───────────────────────────────
    if (paymentIntentId.startsWith("free_")) {
      // Free plan: skip Stripe — verify via Supabase + KV instead
      const userId = await kv.get<string>(`free_user:${paymentIntentId}`);

      if (!userId) {
        return NextResponse.json(
          { error: "Free plan session not found or expired" },
          { status: 404 }
        );
      }

      // Check whether this user still has their free plan available
      // (idempotency: if a plan already exists in KV, they already got one — allow re-fetch)
      const existingPlanCheck = await kv.get(`plan:${paymentIntentId}`);
      if (!existingPlanCheck) {
        // No plan yet — verify user hasn't already used their free plan
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminSupabase = createAdminClient();
        const { data: userData } = await adminSupabase
          .from("unbound_users")
          // Check subscription status and plans_used for free plan eligibility
          .select("subscription_status, plans_used")
          .eq("id", userId)
          .single();

        // Active subscribers have unlimited access — only gate free users
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
    } else {
      // Paid plan: re-verify with Stripe before running expensive pipeline
      const paymentIntent = await getStripe().paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json(
          { error: "Payment has not been completed" },
          { status: 402 }
        );
      }
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
    // Sanitize profile fields before injecting into agent prompts
    const outline: GeneratedOutline = {
      childBrief: storedOutline.childBrief,
      subjects: storedOutline.subjects,
      generatedAt: storedOutline.generatedAt,
      profile: sanitizeProfile(storedOutline.fullProfile),
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

    // ── Resolve userId for ownership checks ─────────────────────────────────
    let planUserId: string | undefined;
    if (paymentIntentId.startsWith("free_")) {
      planUserId = (await kv.get<string>(`free_user:${paymentIntentId}`)) ?? undefined;
    } else {
      // Paid plan: get from Supabase auth session
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      planUserId = user?.id;
    }

    // ── Store completed plan in KV ───────────────────────────────────────────
    // Store plan content + first name only — no sensitive profile data
    // userId is included so get-plan can enforce ownership checks
    const safeStoredPlan = {
      plan: generatedPlan.plan,
      childBrief: generatedPlan.childBrief,
      agentOutputs: generatedPlan.agentOutputs,
      quote: generatedPlan.quote ?? null,
      generatedAt: generatedPlan.generatedAt,
      profile: { childName: generatedPlan.profile.childName },
      userId: planUserId,
    };
    await kv.set(`plan:${paymentIntentId}`, safeStoredPlan, { ex: KV_TTL });

    // ── Persist plan content to Supabase (survives KV 24h expiry) ───────────
    if (planUserId) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/server");
        const adminSupabase = createAdminClient();

        const profile = generatedPlan.profile;
        const subjectsList = (profile.subjectGoals ?? [])
          .map((g: { subject: string }) => g.subject)
          .filter(Boolean)
          .join(", ");

        await adminSupabase.from("unbound_plans").upsert(
          {
            user_id: planUserId,
            kv_session_id: paymentIntentId,
            teacher_plan: generatedPlan.plan,
            student_plan: generatedPlan.plan, // same source; display layer splits via tags
            child_nickname: profile.childName ?? null,
            grade_level: profile.gradeLevel ?? null,
            subjects: subjectsList || null,
            plan_summary: generatedPlan.plan.slice(0, 200),
            payment_intent_id: paymentIntentId.startsWith("free_") ? null : paymentIntentId,
          },
          { onConflict: "kv_session_id" }
        );
      } catch (supaErr) {
        // Non-fatal — plan is already in KV; log and continue
        console.error("[generate-full-plan] Supabase upsert failed:", supaErr);
      }
    }

    // ── Mark complete ────────────────────────────────────────────────────────
    await kv.set(
      `status:${paymentIntentId}`,
      { phase: "complete", progress: 100, message: "Your plan is ready!" },
      { ex: KV_TTL }
    );

    // ── Send email notification if requested ─────────────────────────────────
    try {
      const notifyData = await kv.get<{ email: string }>(`notify:${paymentIntentId}`);
      if (notifyData?.email) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Unbound <hello@unboundlearner.com>",
          to: notifyData.email,
          subject: "Your Unbound plan is ready! 🎉",
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #2d2d2d;">
              <h2 style="color: #5b8f8a;">Your lesson plan is ready! 🎉</h2>
              <p>Hi there!</p>
              <p>Your lesson plan is ready. Click below to view and download it:</p>
              <p style="margin: 24px 0;">
                <a href="https://unboundlearner.com/plan/${paymentIntentId}"
                   style="background: #5b8f8a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  View Your Plan →
                </a>
              </p>
              <p>You can also find all your past plans in your account:</p>
              <p style="margin: 24px 0;">
                <a href="https://unboundlearner.com/account"
                   style="color: #5b8f8a; font-weight: 600;">
                  My Account → https://unboundlearner.com/account
                </a>
              </p>
              <p style="color: #8a8580; font-size: 14px;">— The Unbound Team</p>
            </div>
          `,
        });
        // Clean up notification key
        await kv.del(`notify:${paymentIntentId}`);
      }
    } catch (emailErr) {
      // Non-fatal — plan is done, email is best-effort
      console.error("[generate-full-plan] Email notification failed:", emailErr);
    }

    // ── plans_used is incremented in generate-outline (phase 1) ─────────────
    // We do NOT increment here to avoid double-counting the same plan generation.

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
