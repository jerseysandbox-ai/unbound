/**
 * DELETE /api/admin/delete-plan-data
 *
 * Deletes all plans for a user (keeps the user account).
 * Admin only.
 *
 * Body: { userId: string }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/config";

export async function DELETE(request: Request) {
  try {
    // Verify admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !ADMIN_EMAILS.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Delete all plans for this user; also reset plan counts
    const { error: plansError } = await admin
      .from("unbound_plans")
      .delete()
      .eq("user_id", userId);

    if (plansError) throw plansError;

    // Reset counters
    const { error: resetError } = await admin
      .from("unbound_users")
      .update({ plans_created: 0, free_plan_used: false, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (resetError) throw resetError;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[admin/delete-plan-data] Error:", err);
    return NextResponse.json({ error: "Failed to delete plan data" }, { status: 500 });
  }
}
