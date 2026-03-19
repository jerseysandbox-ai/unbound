/**
 * POST /api/book-recommendations/generate
 *
 * No auth required — open to all users.
 * Accepts reader profile and returns 6 real book recommendations.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert children's librarian and reading specialist with deep knowledge of published children's and middle-grade literature.

Recommend exactly 6 real published books based on the reader profile provided. Every title you recommend must be a real published book that actually exists - do not invent titles or authors.

For each book output exactly this format with these exact labels:

TITLE: [exact published title]
AUTHOR: [author's full name]
DESCRIPTION: [exactly 2 sentences describing what the book is about]
WHY_IT_FITS: [1-2 sentences explaining why this specific reader would love it, referencing their interests or level]
READING_LEVEL: [e.g. Ages 8-12 or Grades 3-5 or Independent reader ages 9-11]
FORMAT: [exactly one of: Novel, Graphic Novel, Nonfiction, Poetry, Picture Book]

Vary your recommendations - include different genres, formats, and styles. If no format preference is given, include a mix.`;

interface RequestBody {
  readingLevel: string;
  interests: string;
  topicOfStudy?: string;
  formatPreference?: string;
}

/** Parse a single book block from Claude output into a structured object */
function parseBook(block: string): { title: string; author: string; description: string; whyItFits: string; readingLevel: string; format: string } | null {
  const title       = block.match(/^TITLE:\s*(.+)/m)?.[1]?.trim();
  const author      = block.match(/^AUTHOR:\s*(.+)/m)?.[1]?.trim();
  const description = block.match(/^DESCRIPTION:\s*([\s\S]+?)(?=^WHY_IT_FITS:|^READING_LEVEL:|^FORMAT:|$)/m)?.[1]?.trim();
  const whyItFits   = block.match(/^WHY_IT_FITS:\s*([\s\S]+?)(?=^READING_LEVEL:|^FORMAT:|$)/m)?.[1]?.trim();
  const readingLevel= block.match(/^READING_LEVEL:\s*(.+)/m)?.[1]?.trim();
  const format      = block.match(/^FORMAT:\s*(.+)/m)?.[1]?.trim();

  if (!title || !author) return null;
  return {
    title,
    author,
    description: description ?? "",
    whyItFits:   whyItFits ?? "",
    readingLevel: readingLevel ?? "",
    format:      format ?? "Novel",
  };
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { readingLevel, interests, topicOfStudy, formatPreference } = body;

    if (!readingLevel?.trim() || !interests?.trim()) {
      return NextResponse.json({ error: "Reading level and interests are required" }, { status: 400 });
    }

    const topicLine = topicOfStudy?.trim()
      ? `\nCurrent topic of study: ${topicOfStudy.trim()}`
      : "";

    const formatLine = formatPreference && formatPreference !== "Any"
      ? `\nFormat preference: ${formatPreference}`
      : "\nFormat preference: Mix of formats welcome";

    const userPrompt = `Reader profile:
Reading level: ${readingLevel.trim()}
Interests: ${interests.trim()}${topicLine}${formatLine}

Please recommend 6 books for this reader.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0].type === "text" ? message.content[0].text : "";

    // Split on TITLE: to get individual book blocks
    const blocks = content.split(/(?=^TITLE:)/m).filter(b => b.trim());
    const books = blocks.map(parseBook).filter(Boolean);

    return NextResponse.json({ books });
  } catch (err) {
    console.error("[book-recommendations/generate]", err);
    return NextResponse.json({ error: "Recommendation failed" }, { status: 500 });
  }
}
