/**
 * POST /api/admin/user-lookup
 * Looks up a Supabase Auth user by email using the service role key.
 * Can also confirm their email or generate a magic login link.
 * Protected by ADMIN_SECRET env var.
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { secret, email, action } = await request.json();

    if (!secret || secret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find user by email
    const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });

    const found = listData?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    // Generate a magic link (works whether or not user exists — creates them if not)
    if (action === "magic_link") {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
      return NextResponse.json({
        ok: true,
        action: "magic_link_generated",
        link: (linkData as { properties?: { action_link?: string } })?.properties?.action_link,
        userExisted: !!found,
      });
    }

    // Force-confirm an existing user's email
    if (action === "confirm_email" && found) {
      const { error: updateError } = await admin.auth.admin.updateUserById(found.id, {
        email_confirm: true,
      });
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      return NextResponse.json({ ok: true, action: "email_confirmed", userId: found.id });
    }

    // Default: just return user info
    return NextResponse.json({
      found: !!found,
      user: found
        ? {
            id: found.id,
            email: found.email,
            confirmed: !!found.email_confirmed_at,
            createdAt: found.created_at,
            lastSignIn: found.last_sign_in_at,
          }
        : null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
