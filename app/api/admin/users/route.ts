/**
 * GET /api/admin/users
 *
 * Returns all Unbound users with plan counts.
 * Only accessible to admin emails.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/config";

export async function GET() {
  try {
    // Verify caller is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !ADMIN_EMAILS.includes(user.email ?? "")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Get all users with their plans
    const { data: users, error: usersError } = await admin
      .from("unbound_users")
      .select(`
        id,
        email,
        free_plan_used,
        plans_created,
        created_at,
        unbound_plans (
          id,
          child_nickname,
          grade_level,
          created_at,
          plan_summary,
          payment_intent_id
        )
      `)
      .order("created_at", { ascending: false });

    if (usersError) {
      throw usersError;
    }

    // Get total counts
    const { count: totalUsers } = await admin
      .from("unbound_users")
      .select("*", { count: "exact", head: true });

    const { count: totalPlans } = await admin
      .from("unbound_plans")
      .select("*", { count: "exact", head: true });

    // New users this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsersThisWeek } = await admin
      .from("unbound_users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", oneWeekAgo);

    return NextResponse.json({
      users,
      stats: { totalUsers, totalPlans, newUsersThisWeek },
    });
  } catch (err: unknown) {
    console.error("[admin/users] Error:", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
