/**
 * GET /api/get-outline/[id]
 *
 * Returns the generated outline for the outline review page (/outline/[id]).
 * Includes fullProfile so the outline page can pass it back on regeneration
 * without needing sessionStorage (fixes "Session expired" bug).
 *
 * Security: requires authentication and ownership check.
 * - Paid outlines: storedData.userId must match session user
 * - Free outlines (id starts with "free_"): free_user:{id} KV key must match
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { createClient } from "@/lib/supabase/server";

interface StoredOutline {
  userId?: string;
  childBrief: string;
  subjects: Array<{
    subject: string;
    emoji: string;
    summary: string;
    estimatedMinutes: number;
  }>;
  generatedAt: string;
  profile: { childName: string };
  fullProfile?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Verify authentication
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const stored = await kv.get<StoredOutline>(`outline:${id}`);

  if (!stored) {
    return NextResponse.json({ error: "Outline not found or expired" }, { status: 404 });
  }

  // Ownership check — determine owner
  let ownerId: string | null = null;

  if (stored.userId) {
    // Owner stored directly on outline
    ownerId = stored.userId;
  } else if (id.startsWith("free_")) {
    // Free plan outline: look up userId from free_user KV key
    ownerId = await kv.get<string>(`free_user:${id}`);
  }

  // Enforce ownership if we can determine the owner
  if (ownerId && ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(stored);
}
