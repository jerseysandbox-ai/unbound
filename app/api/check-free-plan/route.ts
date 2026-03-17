/**
 * POST /api/check-free-plan
 *
 * Checks whether the authenticated user is eligible for a free plan.
 * If yes: generates a freeSessionId, atomically claims it in KV, and
 * returns { isFree: true, freeSessionId }.
 * If no: returns { isFree: false } so the client proceeds to Stripe.
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
import { randomUUID } from "crypto";

// 24 hours in seconds
const KV_TTL = 86400;

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

    // Check free_plan_used in Supabase
    const { data: userData, error: dbError } = await supabase
      .from("unbound_users")
      .select("free_plan_used")
      .eq("id", user.id)
      .single();

    if (dbError || !userData) {
      // User row may not exist yet (race condition on signup trigger)
      // Default to allowing free plan — generate session and claim atomically
      const freeSessionId = `free_${randomUUID()}`;

      // Atomic claim: NX ensures only one concurrent request can succeed
      const claimed = await kv.set(
        `free_claimed:${user.id}`,
        freeSessionId,
        { nx: true, ex: KV_TTL }
      );
      if (claimed === null) {
        // Another concurrent request already claimed the free plan
        return NextResponse.json(
          { error: "Free plan already being generated" },
          { status: 409 }
        );
      }

      await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
      await kv.set(`free_user:${freeSessionId}`, user.id, { ex: KV_TTL });
      return NextResponse.json({ isFree: true, freeSessionId });
    }

    if (userData.free_plan_used) {
      // User has already used their free plan
      return NextResponse.json({ isFree: false });
    }

    // First free plan — atomically claim BEFORE generation to prevent race conditions
    const freeSessionId = `free_${randomUUID()}`;

    const claimed = await kv.set(
      `free_claimed:${user.id}`,
      freeSessionId,
      { nx: true, ex: KV_TTL }
    );
    if (claimed === null) {
      // Another concurrent request already claimed the free plan slot
      return NextResponse.json(
        { error: "Free plan already being generated" },
        { status: 409 }
      );
    }

    // Store pending status so polling page doesn't error immediately
    await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
    // Store userId so generate-outline can mark free plan as used after generation
    await kv.set(`free_user:${freeSessionId}`, user.id, { ex: KV_TTL });

    return NextResponse.json({ isFree: true, freeSessionId });
  } catch (err: unknown) {
    console.error("[check-free-plan] Error:", err);
    return NextResponse.json({ error: "Failed to check plan status" }, { status: 500 });
  }
}
