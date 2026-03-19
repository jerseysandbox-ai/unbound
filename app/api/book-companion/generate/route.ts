/**
 * POST /api/book-companion/generate
 *
 * Accepts a book title, optional author, chapter, reading mode, and focus note.
 * Calls Claude to produce a structured Book Companion (summary, discussion
 * questions with answers, vocabulary, read-aloud tip, cross-subject connection).
 * Saves result to /tmp/book-companion-{id}.json and returns { id }.
 *
 * Auth: requires authenticated Supabase session.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import { join } from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert children's literature educator. Generate a complete Book Companion for a homeschool parent.

If the author is not provided, identify the correct published author from the title and include their name at the very top of your response like: IDENTIFIED_AUTHOR: [Author Name]

Output must have these exact labeled sections:

[SUMMARY]
A 3-sentence summary of the specified chapter or section. Spoiler-aware - only cover what has been read so far.

[DISCUSSION_QUESTIONS]
Exactly 5 discussion questions layered from literal comprehension to inference to personal connection.
Format each exactly like this:
Q1: [question]
ANSWER: [complete thoughtful model answer in 2-4 sentences]

Q2: [question]
ANSWER: [complete thoughtful model answer in 2-4 sentences]

(continue for Q3, Q4, Q5)

[VOCABULARY]
Exactly 6-8 vocabulary words chosen from the chapter. For each word use exactly this format:
WORD: [word]
DEFINITION: [clear age-appropriate definition]
BOOK_SENTENCE: [the sentence from the book where this word appears, or the most plausible sentence from that text]
EXAMPLE_SENTENCE: [a new original example sentence using the word in a different context]
SYNONYMS: [synonym1], [synonym2]

[READ_ALOUD_TIP]
2-3 sentences of practical advice for reading this chapter aloud - where to pause, what voices to try, what to ask in the moment.

[CROSS_SUBJECT]
If this chapter connects to history, science, math, geography, or another academic subject, describe the connection in 1-2 sentences. If there is no strong connection, write exactly: None for this chapter.`;

interface RequestBody {
  title: string;
  author?: string;
  chapter: string;
  readingMode: string;
  focusNote?: string;
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body: RequestBody = await request.json();
    const { title, author, chapter, readingMode, focusNote } = body;

    if (!title?.trim() || !chapter?.trim()) {
      return NextResponse.json({ error: "Title and chapter are required" }, { status: 400 });
    }

    // Build the user prompt
    const authorLine = author?.trim()
      ? `Author: ${author.trim()}`
      : "Author: Unknown - please identify from the title";

    const focusLine = focusNote?.trim()
      ? `\nSpecific focus requested: ${focusNote.trim()}`
      : "";

    const userPrompt = `Book: ${title.trim()}
${authorLine}
Chapter/Section: ${chapter.trim()}
Reading mode: ${readingMode}${focusLine}

Please generate the complete Book Companion now.`;

    // Call Claude
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract identified author if AI found it
    let resolvedAuthor = author?.trim() || "";
    const authorMatch = content.match(/IDENTIFIED_AUTHOR:\s*(.+)/);
    if (authorMatch) {
      resolvedAuthor = authorMatch[1].trim();
    }

    // Save to /tmp
    const id = randomUUID();
    const record = {
      id,
      title: title.trim(),
      author: resolvedAuthor,
      chapter: chapter.trim(),
      readingMode,
      focusNote: focusNote?.trim() || "",
      content,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };

    await writeFile(
      join("/tmp", `book-companion-${id}.json`),
      JSON.stringify(record, null, 2),
      "utf-8"
    );

    return NextResponse.json({ id });
  } catch (err) {
    console.error("[book-companion/generate]", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
