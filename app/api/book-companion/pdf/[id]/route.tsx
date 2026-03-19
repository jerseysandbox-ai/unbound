/**
 * GET /api/book-companion/pdf/[id]?type=teacher|student
 *
 * Streams a PDF for a Book Companion result.
 * Delegates rendering to lib/pdf-templates.tsx (where JSX lives).
 * Auth: requires authenticated Supabase session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { generateBookTeacherPdf, generateBookStudentPdf } from "@/lib/pdf-templates";
import type { BookCompanionData } from "@/lib/pdf-templates";

// ── Section parsers ────────────────────────────────────────────────────────────

function parseSection(content: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[\\w|$)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function parseVocabulary(section: string): BookCompanionData["vocabulary"] {
  const entries: BookCompanionData["vocabulary"] = [];
  const blocks = section.split(/(?=^WORD:)/m).filter(b => b.trim());
  for (const block of blocks) {
    const word            = block.match(/^WORD:\s*(.+)/m)?.[1]?.trim() ?? "";
    const definition      = block.match(/^DEFINITION:\s*(.+)/m)?.[1]?.trim() ?? "";
    const bookSentence    = block.match(/^BOOK_SENTENCE:\s*(.+)/m)?.[1]?.trim() ?? "";
    const exampleSentence = block.match(/^EXAMPLE_SENTENCE:\s*(.+)/m)?.[1]?.trim() ?? "";
    const synonyms        = block.match(/^SYNONYMS:\s*(.+)/m)?.[1]?.trim() ?? "";
    if (word) entries.push({ word, definition, bookSentence, exampleSentence, synonyms });
  }
  return entries;
}

function parseDiscussion(section: string): BookCompanionData["discussion"] {
  const pairs: BookCompanionData["discussion"] = [];
  const blocks = section.split(/Q\d+:/m).filter(b => b.trim());
  for (const block of blocks) {
    const parts = block.split(/ANSWER:/i);
    if (parts.length >= 2) {
      pairs.push({ question: parts[0].trim(), answer: parts[1].trim() });
    }
  }
  return pairs;
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") === "student" ? "student" : "teacher";

    // Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const raw = await readFile(join("/tmp", `book-companion-${id}.json`), "utf-8");
    const record = JSON.parse(raw);

    const data: BookCompanionData = {
      title:       record.title,
      author:      record.author ?? "",
      chapter:     record.chapter,
      summary:     parseSection(record.content, "SUMMARY"),
      discussion:  parseDiscussion(parseSection(record.content, "DISCUSSION_QUESTIONS")),
      vocabulary:  parseVocabulary(parseSection(record.content, "VOCABULARY")),
      readAloudTip: parseSection(record.content, "READ_ALOUD_TIP"),
      crossSubject: parseSection(record.content, "CROSS_SUBJECT"),
    };

    const pdfBytes = type === "teacher"
      ? await generateBookTeacherPdf(data)
      : await generateBookStudentPdf(data);

    const safeName = record.title.replace(/[^a-z0-9]/gi, "-");
    const filename = type === "teacher"
      ? `${safeName}-Teacher-Guide.pdf`
      : `${safeName}-Student-Packet.pdf`;

    return new Response(pdfBytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[book-companion/pdf]", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
