/**
 * DELETE /api/admin/delete-user
 *
 * Deletes a user and all their data (auth + unbound_users + unbound_plans via cascade).
 * Admin only.
 *
 * Body: { userId: string }
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const ADMIN_EMAILS = ["matthewnbrown@gmail.com", "nicoleannenewman@gmail.com"];

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

    // Delete from auth.users (cascades to unbound_users + unbound_plans via FK)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[admin/delete-user] Error:", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
