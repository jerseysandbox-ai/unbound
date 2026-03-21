/**
 * GET /api/plan-status/[id]
 *
 * Returns the current generation status for a given paymentIntentId.
 * Used by the /generating/[id] polling page to track progress and
 * auto-redirect when each phase completes.
 *
 * Response: { phase, progress, message, currentStep? }
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";

interface StatusRecord {
  phase: "generating_outline" | "outline_ready" | "generating_full" | "complete" | "error";
  progress: number; // 0-100
  message: string;
  currentStep?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — must be logged in to poll plan status
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const status = await kv.get<StatusRecord>(`status:${id}`);

  if (!status) {
    // No status record yet — probably still starting up
    return NextResponse.json({
      phase: "generating_outline",
      progress: 0,
      message: "Starting up...",
    });
  }

  return NextResponse.json(status);
}
