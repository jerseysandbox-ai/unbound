/**
 * GET /api/get-outline/[id]
 *
 * Returns the generated outline for the outline review page (/outline/[id]).
 * Strips the fullProfile field before returning — only safe fields go to client.
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
  fullProfile?: unknown; // stored internally, never sent to client
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

  // Return outline data without the fullProfile (sensitive learner details)
  const { fullProfile: _stripped, ...safeOutline } = stored;

  return NextResponse.json(safeOutline);
}
