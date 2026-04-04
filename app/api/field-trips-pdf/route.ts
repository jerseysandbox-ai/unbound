/**
 * POST /api/field-trips-pdf
 *
 * Accepts { subject, zip, distance, suggestions } and returns clean HTML
 * suitable for browser print/save-as-PDF.
 *
 * Auth: requires authenticated Supabase session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RequestBody {
  subject: string;
  zip: string;
  distance: string;
  suggestions: string[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseSuggestion(text: string): { title: string; lines: string[] } {
  const lines = text.split("\n").map(l => l.replace(/^[*#]+\s*/, "").trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  const title = firstLine.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "");
  const body = lines.slice(1).map(l => l.replace(/\*\*/g, "").replace(/^-\s*/, ""));
  return { title, lines: body };
}

function renderLine(text: string): string {
  const escaped = escapeHtml(text);
  const match = escaped.match(/^([A-Za-z][A-Za-z\s]+:)\s*(.*)/);
  if (match) {
    return `<p class="trip-line"><span class="label">${match[1]}</span> ${match[2]}</p>`;
  }
  return `<p class="trip-line">${escaped}</p>`;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { subject, zip, distance, suggestions } = body;

    if (!subject?.trim() || !zip?.trim() || !distance || !suggestions?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const tripCards = suggestions
      .map((raw) => {
        const { title, lines } = parseSuggestion(raw);
        const bodyHtml = lines.map(renderLine).join("\n    ");
        return `  <div class="trip">
    <p class="trip-title">${escapeHtml(title)}</p>
    ${bodyHtml}
  </div>`;
      })
      .join("\n");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Field Trip Ideas: ${escapeHtml(subject)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; color: #2d2d2d; line-height: 1.6; }
    h1 { color: #1a5c5a; font-size: 1.5rem; margin-bottom: 4px; }
    .meta { color: #888; font-size: 0.85rem; margin-bottom: 32px; }
    .trip { margin-bottom: 32px; border-left: 3px solid #4a9d8f; padding-left: 16px; }
    .trip-title { font-size: 1.1rem; font-weight: bold; color: #1a5c5a; margin-bottom: 8px; }
    .trip-line { margin-bottom: 4px; font-size: 0.95rem; }
    .label { font-weight: bold; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Field Trip Ideas: ${escapeHtml(subject)}</h1>
  <p class="meta">Near ${escapeHtml(zip)} within ${escapeHtml(distance)} miles</p>
${tripCards}
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[field-trips-pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
