"use client";

/**
 * Book Companion — /book-companion
 * Parents enter a book title (and optionally author + chapter) to generate
 * chapter summaries, discussion questions with answers, and vocabulary.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type ReadingMode = "independent" | "readaloud" | "audiobook";

export default function BookCompanionPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [chapter, setChapter] = useState("");
  const [readingMode, setReadingMode] = useState<ReadingMode>("independent");
  const [focusNote, setFocusNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !chapter.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/book-companion/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author, chapter, readingMode, focusNote }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const { id } = await res.json();
      router.push(`/book-companion/result/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-[#1a5c5a] font-semibold text-lg">
          Unbound
        </Link>
        <Link href="/book-recommendations" className="text-sm text-[#1a5c5a] hover:underline">
          Book Recommendations
        </Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Companion</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Enter a book you are reading together and get chapter summaries,
            discussion questions, and vocabulary tailored for your read-aloud or
            independent reading session.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Book Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Charlotte's Web"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c5a]/30 focus:border-[#1a5c5a]"
            />
          </div>

          {/* Author (optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Author <span className="text-gray-400 font-normal">(optional - we'll identify it if blank)</span>
            </label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="e.g. E.B. White"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c5a]/30 focus:border-[#1a5c5a]"
            />
          </div>

          {/* Chapter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Chapter or Section <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              placeholder="e.g. Chapter 4, or Chapters 1–3, or just started"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c5a]/30 focus:border-[#1a5c5a]"
            />
          </div>

          {/* Reading mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reading Mode
            </label>
            <div className="flex gap-3 flex-wrap">
              {(["independent", "readaloud", "audiobook"] as ReadingMode[]).map(mode => (
                <label
                  key={mode}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                    readingMode === mode
                      ? "border-[#1a5c5a] bg-[#e8f4f3] text-[#1a5c5a] font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="readingMode"
                    value={mode}
                    checked={readingMode === mode}
                    onChange={() => setReadingMode(mode)}
                    className="sr-only"
                  />
                  {mode === "independent" && "Independent Reading"}
                  {mode === "readaloud" && "Read-Aloud Together"}
                  {mode === "audiobook" && "Audiobook"}
                </label>
              ))}
            </div>
          </div>

          {/* Focus note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Anything specific to focus on? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={focusNote}
              onChange={e => setFocusNote(e.target.value)}
              placeholder="e.g. comprehension, vocabulary, themes, character development..."
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c5a]/30 focus:border-[#1a5c5a] resize-none"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim() || !chapter.trim()}
            className="w-full bg-[#1a5c5a] text-white rounded-lg py-3 text-sm font-semibold hover:bg-[#164e4c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating your Book Companion..." : "Generate Book Companion"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Generation takes about 30 seconds.
        </p>
      </div>
    </div>
  );
}
