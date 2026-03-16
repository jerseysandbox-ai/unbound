/**
 * GET /api/get-outline/[id]
 *
 * Returns the generated outline for the outline review page (/outline/[id]).
 * Includes fullProfile so the outline page can pass it back on regeneration
 * without needing sessionStorage (fixes "Session expired" bug).
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface StoredOutline {
  childBrief: string;
  subjects: Array<{
    subject: string;
    emoji: string;
    summary: string;
    estimatedMinutes: number;
  }>;
  generatedAt: string;
  profile: { childName: string };
  fullProfile?: unknown; // returned to client so outline page can regenerate without sessionStorage
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const stored = await kv.get<StoredOutline>(`outline:${id}`);

  if (!stored) {
    return NextResponse.json({ error: "Outline not found or expired" }, { status: 404 });
  }

  // Return outline data including fullProfile — the ID itself is the auth gate
  // (only someone who knows the paymentIntentId can access this)
  return NextResponse.json(stored);
}
