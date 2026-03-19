"use client";

/**
 * Book Recommendations — /book-recommendations
 * Parents describe their reader and get 6 personalized book picks.
 * No login required — open to all users.
 */

import { useState } from "react";
import Link from "next/link";

type FormatPref = "Any" | "Novel" | "Graphic Novel" | "Nonfiction" | "Poetry";

interface BookRec {
  title: string;
  author: string;
  description: string;
  whyItFits: string;
  readingLevel: string;
  format: string;
}

const FORMAT_COLORS: Record<string, string> = {
  Novel:          "bg-blue-100 text-blue-700",
  "Graphic Novel":"bg-purple-100 text-purple-700",
  Nonfiction:     "bg-amber-100 text-amber-700",
  Poetry:         "bg-pink-100 text-pink-700",
  "Picture Book": "bg-green-100 text-green-700",
};

export default function BookRecommendationsPage() {
  const [readingLevel, setReadingLevel] = useState("");
  const [interests, setInterests] = useState("");
  const [topicOfStudy, setTopicOfStudy] = useState("");
  const [formatPref, setFormatPref] = useState<FormatPref>("Any");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BookRec[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!readingLevel.trim() || !interests.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);

    try {
      const res = await fetch("/api/book-recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readingLevel, interests, topicOfStudy, formatPreference: formatPref }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const { books } = await res.json();
      setResults(books);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-[#1a5c5a] font-semibold text-lg">Unbound</Link>
        <Link href="/book-companion" className="text-sm text-[#1a5c5a] hover:underline">
          Book Companion
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Recommendations</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Tell us about your reader and we will suggest 6 books that match their level,
            interests, and what you are studying together.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* Reading level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Reading Level <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={readingLevel}
              onChange={e => setReadingLevel(e.target.value)}
              placeholder="e.g. reads chapter books independently, or 4th grade level"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c5a]/30 focus:border-[#1a5c5a]"
            />
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Interests <span className="text-red-500">*</span>
            </label>
            <textarea
              value={interests}
              onChange={e => setInterests(e.target.value)}
              placeholder="e.g. dinosaurs, adventure, funny stories, coding, baseball, animals"
              required
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c5a]/30 focus:border-[#1a5c5a] resize-none"
            />
          </div>

          {/* Topic of study */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Topic of Study <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topicOfStudy}
              onChange={e => setTopicOfStudy(e.target.value)}
              placeholder="e.g. American Revolution, ecosystems, fractions, ancient Egypt"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c5a]/30 focus:border-[#1a5c5a]"
            />
          </div>

          {/* Format preference */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Format Preference
            </label>
            <div className="flex gap-2 flex-wrap">
              {(["Any", "Novel", "Graphic Novel", "Nonfiction", "Poetry"] as FormatPref[]).map(f => (
                <label
                  key={f}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                    formatPref === f
                      ? "border-[#1a5c5a] bg-[#e8f4f3] text-[#1a5c5a] font-medium"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f}
                    checked={formatPref === f}
                    onChange={() => setFormatPref(f)}
                    className="sr-only"
                  />
                  {f}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !readingLevel.trim() || !interests.trim()}
            className="w-full bg-[#1a5c5a] text-white rounded-lg py-3 text-sm font-semibold hover:bg-[#164e4c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Finding great books..." : "Get 6 Book Recommendations"}
          </button>
        </form>

        {/* Results */}
        {results && results.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-5">6 Books for Your Reader</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((book, i) => {
                const colorClass = FORMAT_COLORS[book.format] ?? "bg-gray-100 text-gray-700";
                return (
                  <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-3">
                    <div>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${colorClass}`}>
                        {book.format}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base leading-tight">{book.title}</h3>
                      <p className="text-gray-500 text-sm">{book.author}</p>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">{book.description}</p>
                    <div className="bg-[#e8f4f3] rounded-xl px-3 py-2">
                      <p className="text-xs text-[#1a5c5a] leading-relaxed">{book.whyItFits}</p>
                    </div>
                    <p className="text-xs text-gray-400">{book.readingLevel}</p>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => { setResults(null); window.scrollTo(0, 0); }}
                className="text-sm text-[#1a5c5a] hover:underline"
              >
                Search again with different interests
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
