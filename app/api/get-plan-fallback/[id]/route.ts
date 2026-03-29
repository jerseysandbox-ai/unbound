/**
 * GET /api/get-plan-fallback/[id]
 *
 * Fallback plan retrieval from Supabase when KV has expired.
 * Returns a GeneratedPlan-compatible shape reconstructed from Supabase columns.
 */

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
  }

  try {
    // Require authentication — no anonymous access to stored plans
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Look up plan by kv_session_id AND enforce ownership in the query
    const { data: plan, error } = await adminSupabase
      .from("unbound_plans")
      .select("kv_session_id, teacher_plan, student_plan, subjects, child_nickname, grade_level, created_at, user_id")
      .eq("kv_session_id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Reconstruct a GeneratedPlan-compatible response
    const reconstructed = {
      plan: plan.teacher_plan || "",
      studentPlan: plan.student_plan || "",
      childBrief: "",
      agentOutputs: (plan.subjects ?? "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean)
        .map((subject: string) => ({ subject, content: "", error: false })),
      quote: null,
      generatedAt: plan.created_at,
      profile: {
        childName: plan.child_nickname ?? "Your child",
        gradeLevel: plan.grade_level ?? null,
      },
      userId: plan.user_id,
      fromSupabase: true,
    };

    return NextResponse.json(reconstructed);
  } catch (err) {
    console.error("[get-plan-fallback] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
