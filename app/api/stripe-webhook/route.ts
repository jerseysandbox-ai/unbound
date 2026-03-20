/**
 * POST /api/stripe-webhook
 *
 * Handles Stripe webhook events to keep subscription status in sync with
 * the unbound_users table in Supabase.
 *
 * Events handled:
 *   checkout.session.completed     → activate subscription after successful checkout
 *   customer.subscription.updated  → sync status + period_end on plan changes/renewals
 *   customer.subscription.deleted  → mark canceled when subscription ends
 *   invoice.payment_failed         → mark past_due when a renewal payment fails
 *
 * Security: Stripe signature verified using STRIPE_WEBHOOK_SECRET env var.
 * Body must be raw bytes — Next.js must NOT parse it as JSON before we do.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// Disable Next.js body parsing — Stripe signature verification requires raw bytes
export const config = { api: { bodyParser: false } };

// Map Stripe subscription status → our internal status
function mapStripeStatus(
  stripeStatus: string
): "active" | "canceled" | "past_due" | "free" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "unpaid":
      return "canceled";
    case "past_due":
      return "past_due";
    default:
      return "free";
  }
}

// Determine plan label from Stripe price ID
function getPlanFromPriceId(priceId: string): "monthly" | "annual" | null {
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) return "monthly";
  if (priceId === process.env.STRIPE_ANNUAL_PRICE_ID) return "annual";
  return null;
}

export async function POST(request: Request) {
  // Read raw body as text — required for Stripe signature verification
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // Verify webhook authenticity — throws if invalid
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  try {
    switch (event.type) {
      // ── checkout.session.completed ────────────────────────────────────────
      // Fired after a successful Stripe Checkout. Activates the subscription
      // and stores the Stripe customer ID on the user record.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        // Retrieve the subscription to get period_end + price info
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Get supabase_user_id from subscription metadata (set in checkout session)
        const userId =
          subscription.metadata?.supabase_user_id ??
          session.metadata?.supabase_user_id;

        if (!userId) {
          console.error("[stripe-webhook] No supabase_user_id in metadata for session:", session.id);
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId ?? "") ?? subscription.metadata?.plan ?? null;

        await adminSupabase.from("unbound_users").update({
          stripe_customer_id: session.customer as string,
          subscription_status: "active",
          subscription_plan: plan,
          subscription_period_end: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", userId);

        console.log(`[stripe-webhook] Activated subscription for user ${userId}, plan: ${plan}`);
        break;
      }

      // ── customer.subscription.updated ─────────────────────────────────────
      // Fired on renewals, plan changes, or status transitions. Syncs our DB.
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Fall back: look up user by stripe_customer_id
          const { data } = await adminSupabase
            .from("unbound_users")
            .select("id")
            .eq("stripe_customer_id", subscription.customer as string)
            .single();
          if (!data) {
            console.error("[stripe-webhook] Could not find user for customer:", subscription.customer);
            break;
          }

          const priceId = subscription.items.data[0]?.price?.id;
          const plan = getPlanFromPriceId(priceId ?? "") ?? null;

          await adminSupabase.from("unbound_users").update({
            subscription_status: mapStripeStatus(subscription.status),
            subscription_plan: plan,
            subscription_period_end: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", data.id);
          break;
        }

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = getPlanFromPriceId(priceId ?? "") ?? null;

        await adminSupabase.from("unbound_users").update({
          subscription_status: mapStripeStatus(subscription.status),
          subscription_plan: plan,
          subscription_period_end: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", userId);

        console.log(`[stripe-webhook] Updated subscription for user ${userId}: ${subscription.status}`);
        break;
      }

      // ── customer.subscription.deleted ─────────────────────────────────────
      // Fired when a subscription is fully canceled (not just set to cancel at period end).
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        // Look up by customer ID if metadata is missing
        const query = userId
          ? adminSupabase.from("unbound_users").update({
              subscription_status: "canceled",
              subscription_plan: null,
              subscription_period_end: null,
              updated_at: new Date().toISOString(),
            }).eq("id", userId)
          : adminSupabase.from("unbound_users").update({
              subscription_status: "canceled",
              subscription_plan: null,
              subscription_period_end: null,
              updated_at: new Date().toISOString(),
            }).eq("stripe_customer_id", subscription.customer as string);

        await query;
        console.log(`[stripe-webhook] Subscription canceled for user ${userId ?? `customer:${subscription.customer}`}`);
        break;
      }

      // ── invoice.payment_failed ─────────────────────────────────────────────
      // Fired when a renewal charge fails. Mark as past_due so we can show
      // a "payment failed — update your card" prompt in the UI.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await adminSupabase.from("unbound_users").update({
          subscription_status: "past_due",
          updated_at: new Date().toISOString(),
        }).eq("stripe_customer_id", customerId);

        console.log(`[stripe-webhook] Payment failed for customer ${customerId}`);
        break;
      }

      default:
        // Unhandled event — log and return 200 so Stripe doesn't retry
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error processing ${event.type}:`, err);
    // Still return 200 — returning non-2xx would cause Stripe to retry
  }

  return NextResponse.json({ received: true });
}
