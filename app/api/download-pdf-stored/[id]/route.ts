/**
 * GET /api/download-pdf-stored/[id]
 *
 * Downloads a stored plan PDF from Supabase (works even after KV expiry).
 * Requires auth and verifies the plan belongs to the requesting user.
 */

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing plan ID" }, { status: 400 });
  }

  try {
    // Require authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up plan by kv_session_id AND verify ownership
    const adminSupabase = createAdminClient();
    const { data: plan, error } = await adminSupabase
      .from("unbound_plans")
      .select("teacher_plan, child_nickname, grade_level, created_at")
      .eq("kv_session_id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const date = new Date(plan.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Unbound Plan — ${plan.child_nickname ?? "Your child"}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #2d2d2d; line-height: 1.7; }
    h1 { color: #5b8f8a; border-bottom: 2px solid #5b8f8a; padding-bottom: 8px; }
    h2, h3 { color: #3d6e69; }
    pre { white-space: pre-wrap; font-family: inherit; }
    .meta { color: #8a8580; font-size: 0.9em; margin-bottom: 32px; }
  </style>
</head>
<body>
  <h1>Unbound — Teacher Guide</h1>
  <p class="meta">${plan.child_nickname ?? "Your child"} · ${plan.grade_level ?? ""} · ${date}</p>
  <pre>${(plan.teacher_plan ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="unbound-plan-${id}.html"`,
      },
    });
  } catch (err) {
    console.error("[download-pdf-stored] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
