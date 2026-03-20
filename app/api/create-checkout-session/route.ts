/**
 * POST /api/create-checkout-session
 *
 * Creates a Stripe Checkout Session for a subscription plan.
 * Returns { url } — client should redirect to this URL.
 *
 * Body: { plan: 'monthly' | 'annual' }
 * Auth: required (Supabase session)
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// Map plan name → Stripe price ID (set in Doppler/Vercel env vars)
function getPriceId(plan: "monthly" | "annual"): string {
  const id =
    plan === "monthly"
      ? process.env.STRIPE_MONTHLY_PRICE_ID
      : process.env.STRIPE_ANNUAL_PRICE_ID;

  if (!id) {
    throw new Error(`Missing env var: STRIPE_${plan.toUpperCase()}_PRICE_ID`);
  }
  return id;
}

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const { plan } = body as { plan?: string };

    if (plan !== "monthly" && plan !== "annual") {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    // Require authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use admin client to read/write stripe_customer_id (bypasses RLS)
    const adminSupabase = createAdminClient();
    const { data: userData } = await adminSupabase
      .from("unbound_users")
      .select("stripe_customer_id, subscription_status")
      .eq("id", user.id)
      .single();

    // Create or retrieve the Stripe customer for this user
    let customerId = userData?.stripe_customer_id;

    if (!customerId) {
      // No customer yet — create one and store it
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      // Persist so future checkouts reuse the same customer
      await adminSupabase
        .from("unbound_users")
        .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    // Build the Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: getPriceId(plan), quantity: 1 }],
      // success_url includes session_id so we can verify on the dashboard if needed
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://unboundlearner.com"}/dashboard?subscribed=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://unboundlearner.com"}/pricing`,
      // Store plan choice in metadata so the webhook knows which plan was purchased
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          plan,
        },
      },
      // Pre-fill email for a smoother checkout UX
      customer_email: customerId ? undefined : user.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-checkout-session] Error:", msg);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
