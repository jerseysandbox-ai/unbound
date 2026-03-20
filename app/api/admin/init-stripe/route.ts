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

  // Helper: find an existing product by metadata tag so this is idempotent
  async function findOrCreateProduct(name: string, tag: string) {
    const existing = await stripe.products.search({
      query: `metadata['unbound_tag']:'${tag}'`,
    });
    if (existing.data.length > 0) return existing.data[0];
    return stripe.products.create({
      name,
      metadata: { unbound_tag: tag },
    });
  }

  // Create/retrieve Monthly product + price
  const monthlyProduct = await findOrCreateProduct("Unbound Monthly", "unbound_monthly");
  let monthlyPrice = (
    await stripe.prices.list({ product: monthlyProduct.id, active: true, limit: 1 })
  ).data[0];
  if (!monthlyPrice) {
    monthlyPrice = await stripe.prices.create({
      product: monthlyProduct.id,
      unit_amount: 1900, // $19.00
      currency: "usd",
      recurring: { interval: "month" },
      nickname: "Unbound Monthly $19",
    });
  }

  // Create/retrieve Annual product + price
  const annualProduct = await findOrCreateProduct("Unbound Annual", "unbound_annual");
  let annualPrice = (
    await stripe.prices.list({ product: annualProduct.id, active: true, limit: 1 })
  ).data[0];
  if (!annualPrice) {
    annualPrice = await stripe.prices.create({
      product: annualProduct.id,
      unit_amount: 14900, // $149.00
      currency: "usd",
      recurring: { interval: "year" },
      nickname: "Unbound Annual $149",
    });
  }

  return NextResponse.json({
    message: "Stripe products and prices ready. Add these to Doppler:",
    STRIPE_MONTHLY_PRICE_ID: monthlyPrice.id,
    STRIPE_ANNUAL_PRICE_ID: annualPrice.id,
    monthlyProduct: monthlyProduct.id,
    annualProduct: annualProduct.id,
  });
}
