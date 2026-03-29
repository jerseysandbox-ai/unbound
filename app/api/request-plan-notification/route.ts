/**
 * POST /api/request-plan-notification
 *
 * Stores an email notification request in KV so the generation pipeline can
 * send an email when the plan is ready.
 *
 * Body: { sessionId: string, email: string }
 */

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";

// 2 hours TTL — long enough to survive any generation
const NOTIFY_TTL = 7200;

export async function POST(request: Request) {
  try {
    const { sessionId, email } = await request.json();

    if (!sessionId || !email) {
      return NextResponse.json({ error: "Missing sessionId or email" }, { status: 400 });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Require authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Store notification request in KV
    await kv.set(`notify:${sessionId}`, { email }, { ex: NOTIFY_TTL });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[request-plan-notification] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
