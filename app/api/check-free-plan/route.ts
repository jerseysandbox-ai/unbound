/**
 * POST /api/check-free-plan
 *
 * Checks whether the authenticated user is eligible for a free plan.
 * If yes: generates a freeSessionId, stores the profile in KV, and
 * returns { isFree: true, freeSessionId }.
 * If no: returns { isFree: false } so the client proceeds to Stripe.
 *
 * Body: { turnstileToken: string }
 */
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

// 24 hours in seconds
const KV_TTL = 86400;

export async function POST(_request: Request) {
  try {
    // Verify user is authenticated
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
      // Default to allowing free plan
      const freeSessionId = `free_${randomUUID()}`;
      await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
      return NextResponse.json({ isFree: true, freeSessionId });
    }

    if (userData.free_plan_used) {
      // User has already used their free plan
      return NextResponse.json({ isFree: false });
    }

    // First free plan — generate a session ID
    const freeSessionId = `free_${randomUUID()}`;
    // Store pending status so polling page doesn't error immediately
    await kv.set(`status:${freeSessionId}`, { phase: "pending", progress: 0 }, { ex: KV_TTL });
    // Store userId in KV so generate-outline can mark free plan as used after generation
    await kv.set(`free_user:${freeSessionId}`, user.id, { ex: KV_TTL });

    return NextResponse.json({ isFree: true, freeSessionId });
  } catch (err: unknown) {
    console.error("[check-free-plan] Error:", err);
    return NextResponse.json({ error: "Failed to check plan status" }, { status: 500 });
  }
}
