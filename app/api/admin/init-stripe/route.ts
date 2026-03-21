/**
 * GET /api/admin/init-stripe
 *
 * One-time setup route: creates Stripe products + prices for Unbound
 * subscription plans and returns the price IDs to store in Doppler.
 *
 * Protected: admin emails only.
 * Idempotent: looks up existing products by metadata tag before creating.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { ADMIN_EMAILS } from "@/lib/config";

export async function GET() {
  // Auth check — admin only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-02-25.clover",
  });

  try {
    // List existing products and filter by metadata tag to avoid duplicates.
    // We avoid products.search() — not supported on all Stripe plan tiers.
    const existingProducts = await stripe.products.list({ limit: 100 });
    const existingMonthly = existingProducts.data.find(
      (p) => p.metadata?.unbound_tag === "unbound_monthly"
    );
    const existingAnnual = existingProducts.data.find(
      (p) => p.metadata?.unbound_tag === "unbound_annual"
    );

    // Create or reuse monthly product
    const monthlyProduct = existingMonthly ?? await stripe.products.create({
      name: "Unbound Monthly",
      metadata: { unbound_tag: "unbound_monthly" },
    });

    // Get or create monthly price
    let monthlyPrice: Stripe.Price;
    if (existingMonthly) {
      const existingPrices = await stripe.prices.list({ product: existingMonthly.id, limit: 10 });
      monthlyPrice = existingPrices.data[0] ?? await stripe.prices.create({
        product: monthlyProduct.id,
        unit_amount: 1900,
        currency: "usd",
        recurring: { interval: "month" },
        nickname: "Unbound Monthly $19",
      });
    } else {
      monthlyPrice = await stripe.prices.create({
        product: monthlyProduct.id,
        unit_amount: 1900,
        currency: "usd",
        recurring: { interval: "month" },
        nickname: "Unbound Monthly $19",
      });
    }

    // Create or reuse annual product
    const annualProduct = existingAnnual ?? await stripe.products.create({
      name: "Unbound Annual",
      metadata: { unbound_tag: "unbound_annual" },
    });

    // Get or create annual price
    let annualPrice: Stripe.Price;
    if (existingAnnual) {
      const existingPrices = await stripe.prices.list({ product: existingAnnual.id, limit: 10 });
      annualPrice = existingPrices.data[0] ?? await stripe.prices.create({
        product: annualProduct.id,
        unit_amount: 14900,
        currency: "usd",
        recurring: { interval: "year" },
        nickname: "Unbound Annual $149",
      });
    } else {
      annualPrice = await stripe.prices.create({
        product: annualProduct.id,
        unit_amount: 14900,
        currency: "usd",
        recurring: { interval: "year" },
        nickname: "Unbound Annual $149",
      });
    }

    return NextResponse.json({
      message: "Done. Add these to Doppler (unbound project):",
      STRIPE_MONTHLY_PRICE_ID: monthlyPrice.id,
      STRIPE_ANNUAL_PRICE_ID: annualPrice.id,
      monthlyProductId: monthlyProduct.id,
      annualProductId: annualProduct.id,
    });
  } catch (err) {
    console.error("[init-stripe] Stripe error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
