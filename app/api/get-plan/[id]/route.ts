/**
 * GET /api/get-plan/[id]
 *
 * Retrieves a generated plan from Vercel KV by PaymentIntent ID.
 * Plans expire after 24 hours.
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import type { GeneratedPlan } from "@/lib/agents";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
    }

    const plan = await kv.get<GeneratedPlan>(`plan:${id}`);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (err: unknown) {
    console.error("[get-plan] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve plan" },
      { status: 500 }
    );
  }
}
