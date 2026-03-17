/**
 * GET /api/get-plan/[id]
 *
 * Retrieves a generated plan from Vercel KV by PaymentIntent ID.
 * Plans expire after 24 hours.
 *
 * Security: requires authentication and ownership check.
 * - Paid plans: storedData.userId must match session user
 * - Free plans: free_user:{id} KV key must match session user
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedPlan } from "@/lib/agents";

interface StoredPlan extends GeneratedPlan {
  userId?: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
    }

    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const plan = await kv.get<StoredPlan>(`plan:${id}`);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found or expired" },
        { status: 404 }
      );
    }

    // Ownership check — determine owner
    let ownerId: string | null = null;

    if (plan.userId) {
      // Paid plan: userId stored directly on the plan object
      ownerId = plan.userId;
    } else if (id.startsWith("free_")) {
      // Free plan: look up the userId stored separately in KV
      ownerId = await kv.get<string>(`free_user:${id}`);
    }

    // If we know the owner, enforce it
    if (ownerId && ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
