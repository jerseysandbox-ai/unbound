/**
 * POST /api/admin/fix-unlimited
 * Protected by ADMIN_SECRET env var.
 * Sets is_unlimited=true and free_plan_used=false for a given email,
 * and clears any stale KV blocking keys for that user.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { kv } from "@vercel/kv";

export async function POST(request: Request) {
  const { secret, email } = await request.json().catch(() => ({}));

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Look up user by email
  const { data: authUser, error: authErr } = await supabase.auth.admin.getUserByEmail(email);
  if (authErr || !authUser?.user) {
    return NextResponse.json({ error: `User not found: ${authErr?.message}` }, { status: 404 });
  }

  const userId = authUser.user.id;

  // Set is_unlimited=true and reset free_plan_used
  const { error: updateErr } = await supabase
    .from("unbound_users")
    .upsert({ id: userId, is_unlimited: true, free_plan_used: false }, { onConflict: "id" });

  if (updateErr) {
    return NextResponse.json({ error: `DB update failed: ${updateErr.message}` }, { status: 500 });
  }

  // Clear any stale KV blocking keys
  await kv.del(`free_claimed:${userId}`);

  return NextResponse.json({
    ok: true,
    userId,
    email,
    message: "is_unlimited=true, free_plan_used=false, KV cleared",
  });
}
