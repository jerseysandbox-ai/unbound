/**
 * POST /api/field-trips
 *
 * Accepts subject, zip code, and max distance. Calls Claude to suggest
 * 5-7 field trip ideas that complement the unit of study.
 * Returns { suggestions: string } — raw markdown from Claude.
 *
 * Auth: requires authenticated Supabase session.
 * Bot protection: Cloudflare Turnstile token required.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Verifies a Cloudflare Turnstile token server-side. Returns true if valid. */
async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[field-trips] TURNSTILE_SECRET_KEY is not set");
    return false;
  }
  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData,
  });
  const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
  // Log error codes so we can diagnose failures in Vercel logs
  if (!data.success) {
    console.error("[field-trips] Turnstile failed:", data["error-codes"]);
  }
  return data.success === true;
}

interface RequestBody {
  subject: string;
  zip: string;
  distance: string;
  turnstileToken: string;
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { subject, zip, distance, turnstileToken } = body;

    // Validate inputs — cap subject at 200 chars to prevent prompt bloat
    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (subject.trim().length > 200) {
      return NextResponse.json({ error: "Subject must be 200 characters or less" }, { status: 400 });
    }
    if (!zip?.trim() || !/^\d{5}$/.test(zip.trim())) {
      return NextResponse.json({ error: "A valid 5-digit zip code is required" }, { status: 400 });
    }
    if (!distance) {
      return NextResponse.json({ error: "Travel distance is required" }, { status: 400 });
    }
    if (!turnstileToken) {
      return NextResponse.json({ error: "Missing Turnstile token" }, { status: 400 });
    }

    // Verify Turnstile
    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return NextResponse.json({ error: "Turnstile verification failed" }, { status: 403 });
    }

    const userPrompt = `You are a homeschool curriculum expert helping a family find educational field trips.

Subject/Unit: ${subject.trim()}
Location: near zip code ${zip.trim()}, within ${distance} miles

Suggest 5-7 specific field trip ideas that would complement this unit of study. For each suggestion include:
- Name of the place/experience (as a type of venue, e.g. "Natural History Museum")
- Why it connects to the subject
- Approximate distance guidance (e.g. "typically found in most metro areas" or "look for this type of venue near you")
- Type of venue (museum, nature center, historical site, etc.)
- Tips for making it educational (specific exhibits to look for, questions to ask, activities to do, etc.)

Format each field trip as a numbered entry with clear section labels. Be specific and practical. Focus on types of venues commonly found across the US — museums, state parks, historical sites, science centers, zoos, botanical gardens, libraries, cultural centers, etc. Note that you don't have real-time location data, so describe the types of places to look for and how to find them locally rather than specific addresses.

Make your suggestions feel warm and actionable — these are real families planning real days out.`;

    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: userPrompt }],
    });

    const suggestions =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[field-trips]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
