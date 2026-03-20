/**
 * POST /api/check-free-plan
 *
 * Checks whether the authenticated user is eligible for a free plan.
 * Free tier: up to 4 plans total (tracked by plans_used column).
 *
 * If yes: generates a freeSessionId, atomically claims it in KV, and
 * returns { isFree: true, freeSessionId }.
 * If no: returns { isFree: false } with upgrade hint.
 *
 * Body: { turnstileToken: string }
 *
 * Security:
 *  - Requires valid Turnstile token (bot protection)
 *  - Requires authenticated session (middleware also enforces this)
 *  - Uses KV atomic NX set to prevent race conditions on simultaneous requests
 */
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { ADMIN_EMAILS } from "@/lib/config";

// 24 hours in seconds
const KV_TTL = 86400;

// Free plan limit — users can generate this many plans before needing to upgrade
const FREE_PLAN_LIMIT = 4;

/** Verifies a Cloudflare Turnstile token server-side. Returns true if valid. */
async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[check-free-plan] TURNSTILE_SECRET_KEY is not set");
    return false;
  }

  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });

  const data = await res.json() as { success: boolean };
  return data.success === true;
}

export async function POST(request: Request) {
  try {
    // Parse body
    const body = await request.json().catch(() => ({}));
    const { turnstileToken } = body as { turnstileToken?: string };

    // Verify Turnstile token — required to prevent bot abuse
    if (!turnstileToken) {
      return NextResponse.json({ error: "Missing Turnstile token" }, { status: 400 });
    }

    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return NextResponse.json({ error: "Turnstile verification failed" }, { status: 403 });
    }

    // Verify user is authenticated (middleware enforces this too, belt-and-suspenders)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use admin client to bypass RLS for subscription status reads
    const adminSupabase = createAdminClient();
    const { data: userData, error: dbError } = await adminSupabase
      .from("unbound_users")
      .select("plans_used, subscription_status, is_unlimited")
      .eq("id", user.id)
      .single();

    // ── Admins and is_unlimited accounts always bypass ALL plan limits ────────
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
    if (isAdmin || (!dbError && userData?.is_unlimited)) {
      const freeSessionId = `free_${randomUUID()}`;
      await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
      await kv.set(`free_user:${freeSessionId}`, user.id, { ex: KV_TTL });
      return NextResponse.json({ isFree: true, freeSessionId });
    }

    // ── Active subscribers always bypass plan limits ───────────────────────
    if (!dbError && userData?.subscription_status === "active") {
      const freeSessionId = `free_${randomUUID()}`;
      await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
      await kv.set(`free_user:${freeSessionId}`, user.id, { ex: KV_TTL });
      return NextResponse.json({ isFree: true, freeSessionId });
    }

    if (dbError || !userData) {
      // User row may not exist yet (race condition on signup trigger)
      // Default to allowing plan — generate session and claim atomically
      const freeSessionId = `free_${randomUUID()}`;

      // Atomic claim: NX ensures only one concurrent request can succeed
      const claimed = await kv.set(
        `free_claimed:${user.id}`,
        freeSessionId,
        { nx: true, ex: KV_TTL }
      );
      if (claimed === null) {
        return NextResponse.json(
          { error: "A plan is already being generated" },
          { status: 409 }
        );
      }

      await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
      await kv.set(`free_user:${freeSessionId}`, user.id, { ex: KV_TTL });
      return NextResponse.json({ isFree: true, freeSessionId });
    }

    // ── Check free plan limit (plans_used < FREE_PLAN_LIMIT) ──────────────
    const plansUsed = userData.plans_used ?? 0;

    if (plansUsed >= FREE_PLAN_LIMIT) {
      // User has hit their free plan limit — send them to upgrade
      return NextResponse.json({
        isFree: false,
        upgradeRequired: true,
        plansUsed,
        limit: FREE_PLAN_LIMIT,
      });
    }

    // Still has free plans remaining — atomically claim a session
    const freeSessionId = `free_${randomUUID()}`;

    const claimed = await kv.set(
      `free_claimed:${user.id}`,
      freeSessionId,
      { nx: true, ex: KV_TTL }
    );
    if (claimed === null) {
      return NextResponse.json(
        { error: "A plan is already being generated" },
        { status: 409 }
      );
    }

    await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
    await kv.set(`free_user:${freeSessionId}`, user.id, { ex: KV_TTL });

    return NextResponse.json({
      isFree: true,
      freeSessionId,
      plansUsed,
      plansRemaining: FREE_PLAN_LIMIT - plansUsed,
    });
  } catch (err: unknown) {
    console.error("[check-free-plan] Error:", err);
    return NextResponse.json({ error: "Failed to check plan status" }, { status: 500 });
  }
}
