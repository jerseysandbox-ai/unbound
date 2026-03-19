/**
 * Book Companion result page — /book-companion/result/[id]
 *
 * Loads the generated companion from /tmp/book-companion-{id}.json,
 * parses the structured sections, and renders them with download buttons.
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { notFound } from "next/navigation";
import Link from "next/link";
import BookCompanionResult from "./BookCompanionResult";

interface StoredCompanion {
  id: string;
  title: string;
  author: string;
  chapter: string;
  readingMode: string;
  content: string;
  createdAt: string;
}

/** Parse a named section from the tagged content string */
function parseSection(content: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[\\w|$)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

/** Parse vocabulary entries from the [VOCABULARY] section */
export interface VocabEntry {
  word: string;
  definition: string;
  bookSentence: string;
  exampleSentence: string;
  synonyms: string;
}

function parseVocabulary(vocabSection: string): VocabEntry[] {
  const entries: VocabEntry[] = [];
  // Split on WORD: to get individual entries
  const blocks = vocabSection.split(/(?=^WORD:)/m).filter(b => b.trim());

  for (const block of blocks) {
    const word = block.match(/^WORD:\s*(.+)/m)?.[1]?.trim() ?? "";
    const definition = block.match(/^DEFINITION:\s*(.+)/m)?.[1]?.trim() ?? "";
    const bookSentence = block.match(/^BOOK_SENTENCE:\s*(.+)/m)?.[1]?.trim() ?? "";
    const exampleSentence = block.match(/^EXAMPLE_SENTENCE:\s*(.+)/m)?.[1]?.trim() ?? "";
    const synonyms = block.match(/^SYNONYMS:\s*(.+)/m)?.[1]?.trim() ?? "";
    if (word) entries.push({ word, definition, bookSentence, exampleSentence, synonyms });
  }
  return entries;
}

/** Parse discussion Q&A pairs */
export interface DiscussionQA {
  question: string;
  answer: string;
}

function parseDiscussion(section: string): DiscussionQA[] {
  const pairs: DiscussionQA[] = [];
  const blocks = section.split(/Q\d+:/m).filter(b => b.trim());
  for (const block of blocks) {
    const parts = block.split(/ANSWER:/i);
    if (parts.length >= 2) {
      pairs.push({
        question: parts[0].trim(),
        answer: parts[1].trim(),
      });
    }
  }
  return pairs;
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let companion: StoredCompanion;
  try {
    const raw = await readFile(join("/tmp", `book-companion-${id}.json`), "utf-8");
    companion = JSON.parse(raw);
  } catch {
    notFound();
  }

  const summary = parseSection(companion.content, "SUMMARY");
  const vocabSection = parseSection(companion.content, "VOCABULARY");
  const discussionSection = parseSection(companion.content, "DISCUSSION_QUESTIONS");
  const readAloudTip = parseSection(companion.content, "READ_ALOUD_TIP");
  const crossSubject = parseSection(companion.content, "CROSS_SUBJECT");

  const vocabulary = parseVocabulary(vocabSection);
  const discussion = parseDiscussion(discussionSection);

  return (
    <BookCompanionResult
      id={id}
      title={companion.title}
      author={companion.author}
      chapter={companion.chapter}
      summary={summary}
      discussion={discussion}
      vocabulary={vocabulary}
      readAloudTip={readAloudTip}
      crossSubject={crossSubject}
    />
  );
}
