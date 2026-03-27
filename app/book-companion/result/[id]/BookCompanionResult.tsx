"use client";

/**
 * Client component for the Book Companion result page.
 * Renders summary, discussion Q&A (with collapsible answers),
 * vocabulary cards, read-aloud tip, and cross-subject connection.
 * Provides PDF download buttons for teacher and student versions.
 */

import { useState } from "react";
import Link from "next/link";
import type { VocabEntry, DiscussionQA } from "./page";

interface Props {
  id: string;
  title: string;
  author: string;
  chapter: string;
  summary: string;
  discussion: DiscussionQA[];
  vocabulary: VocabEntry[];
  readAloudTip: string;
  crossSubject: string;
}

export default function BookCompanionResult({
  id, title, author, chapter, summary, discussion, vocabulary, readAloudTip, crossSubject,
}: Props) {
  // Track which answers are expanded
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleAnswer(i: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const showCrossSubject = crossSubject && !crossSubject.toLowerCase().startsWith("none");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-[#1a5c5a] font-semibold text-lg">Unbound</Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/book-companion" className="text-[#1a5c5a] hover:underline hidden sm:inline">
            New Book Companion
          </Link>
          <Link href="/field-trips" className="text-[#1a5c5a] hover:underline">
            Field Trips
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {author && <span>{author} · </span>}{chapter}
          </p>

          {/* Download buttons */}
          <div className="flex gap-3 mt-4 flex-wrap">
            <a
              href={`/api/book-companion/pdf/${id}?type=teacher`}
              className="inline-flex items-center gap-2 bg-[#1a5c5a] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#164e4c] transition-colors"
            >
              <DownloadIcon /> Teacher Guide PDF
            </a>
            <a
              href={`/api/book-companion/pdf/${id}?type=student`}
              className="inline-flex items-center gap-2 border border-[#1a5c5a] text-[#1a5c5a] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#e8f4f3] transition-colors"
            >
              <DownloadIcon /> Student Packet PDF
            </a>
          </div>
        </div>

        {/* Summary */}
        <Section title="Chapter Summary">
          <p className="text-gray-700 text-sm leading-relaxed">{summary}</p>
        </Section>

        {/* Discussion Questions */}
        <Section title="Discussion Questions">
          <div className="space-y-3">
            {discussion.map((qa, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => toggleAnswer(i)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#e8f4f3] text-[#1a5c5a] text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-800 flex-1">{qa.question}</span>
                  <ChevronIcon expanded={expanded.has(i)} />
                </button>
                {expanded.has(i) && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-[#fafafa]">
                    <p className="text-sm text-gray-600 leading-relaxed ml-9">{qa.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Click any question to reveal the model answer.</p>
        </Section>

        {/* Vocabulary */}
        {vocabulary.length > 0 && (
          <Section title={`Vocabulary (${vocabulary.length} words)`}>
            <div className="space-y-3">
              {vocabulary.map((v, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-bold text-[#1a5c5a] text-base">{v.word}</span>
                    <span className="text-gray-500 text-sm flex-1">{v.definition}</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <p><span className="font-medium text-gray-500">In the book:</span> <em>{v.bookSentence}</em></p>
                    <p><span className="font-medium text-gray-500">Example:</span> {v.exampleSentence}</p>
                    <p><span className="font-medium text-gray-500">Synonyms:</span> {v.synonyms}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Read-Aloud Tip */}
        {readAloudTip && (
          <Section title="Read-Aloud Tip">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-900 leading-relaxed">{readAloudTip}</p>
            </div>
          </Section>
        )}

        {/* Cross-Subject */}
        {showCrossSubject && (
          <Section title="Cross-Subject Connection">
            <div className="bg-[#e8f4f3] border border-[#b0cece] rounded-xl p-4">
              <p className="text-sm text-[#1a5c5a] leading-relaxed">{crossSubject}</p>
            </div>
          </Section>
        )}

        <div className="text-center pt-4">
          <Link href="/book-companion" className="text-sm text-[#1a5c5a] hover:underline">
            Generate another Book Companion
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v11" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
