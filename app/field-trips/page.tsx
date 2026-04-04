"use client";

/**
 * Field Trip Finder — /field-trips
 * Parents enter a subject/unit, zip code, and max travel distance to get
 * Claude-powered field trip ideas that complement their current unit of study.
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const TurnstileWidget = dynamic(() => import("@/components/TurnstileWidget"), {
  ssr: false,
});

const DISTANCE_OPTIONS = [
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" },
];

// Parse Claude's numbered list output into individual trip objects
function parseSuggestions(raw: string): string[] {
  // Split on numbered entries like "1." "2." etc.
  const entries = raw.split(/\n(?=\d+\.)/).map((s) => s.trim()).filter(Boolean);
  return entries.length > 1 ? entries : [raw];
}

// Parse a single suggestion string into title + body lines
function parseSuggestion(text: string): { title: string; lines: string[] } {
  const lines = text.split('\n').map(l => l.replace(/^[*#]+\s*/, '').trim()).filter(Boolean);
  const firstLine = lines[0] || '';
  const title = firstLine.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '');
  const body = lines.slice(1).map(l => l.replace(/\*\*/g, '').replace(/^-\s*/, ''));
  return { title, lines: body };
}

// Render a body line, bolding label prefixes like "Why it fits:" or "How to find it:"
function SuggestionLine({ text }: { text: string }) {
  const match = text.match(/^([A-Za-z][A-Za-z\s]+:)\s*(.*)/);
  if (match) {
    return (
      <p className="mb-1 text-sm text-gray-700 leading-relaxed">
        <span className="font-semibold text-gray-800">{match[1]}</span> {match[2]}
      </p>
    );
  }
  return <p className="mb-1 text-sm text-gray-700 leading-relaxed">{text}</p>;
}

export default function FieldTripsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authChecked, setAuthChecked] = useState(false);
  const [subject, setSubject] = useState(searchParams.get("subject") ?? "");
  const [zip, setZip] = useState(searchParams.get("zip") ?? "");
  const [distance, setDistance] = useState(searchParams.get("distance") ?? "25");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [resetKey, setResetKey] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Auth guard — redirect to login if not signed in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
      } else {
        setAuthChecked(true);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !zip.trim() || !distance) return;
    if (!turnstileToken) {
      setError("Please complete the security check.");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions([]);

    try {
      const res = await fetch("/api/field-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, zip, distance, turnstileToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      const parsedSuggestions = parseSuggestions(data.suggestions);
      setSuggestions(parsedSuggestions);

      // Save in background -- don't block the UI or show errors to user
      fetch("/api/save-field-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, zip, distance, suggestions: parsedSuggestions }),
      }).catch(() => {});

      // Reset Turnstile for next submission
      setTurnstileToken(null);
      setResetKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5b8f8a] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-[#1a5c5a] font-semibold text-lg">
          Unbound
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/profile" className="text-[#1a5c5a] hover:underline hidden sm:inline">
            Create a Plan
          </Link>
          <Link href="/field-trips" className="text-[#1a5c5a] font-semibold hover:underline">
            Field Trips
          </Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Field Trip Finder</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Tell us what you&apos;re studying and where you are. We&apos;ll suggest field trips
            that bring your unit to life: museums, nature centers, historical sites, and more.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
        >
          {/* Subject */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Subject / Unit Focus <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Ancient Egypt, Ecosystems, American Revolution"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] focus:border-transparent"
              required
            />
          </div>

          {/* Zip Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Zip Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="e.g. 80203"
              maxLength={5}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] focus:border-transparent"
              required
            />
          </div>

          {/* Distance */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Max Travel Distance <span className="text-red-500">*</span>
            </label>
            <select
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#5b8f8a] focus:border-transparent bg-white"
              required
            >
              {DISTANCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Turnstile */}
          <div>
            <TurnstileWidget
              key={resetKey}
              onVerify={(token) => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !subject.trim() || zip.trim().length !== 5 || !turnstileToken}
            className="w-full bg-[#5b8f8a] hover:bg-[#3d6e69] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Finding field trips…
              </span>
            ) : (
              "Generate Field Trip Ideas"
            )}
          </button>
        </form>

        {/* Results */}
        {suggestions.length > 0 && (
          <div className="mt-10 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              Field Trip Ideas for &ldquo;{subject}&rdquo;
            </h2>
            <p className="text-xs text-gray-400">
              These are suggestions based on types of venues commonly found near {zip}. Always verify hours and details before visiting.
            </p>
            {suggestions.map((trip, i) => {
              const { title, lines } = parseSuggestion(trip);
              return (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                >
                  <h3 className="font-bold text-[#1a5c5a] mb-2">{title}</h3>
                  {lines.map((line, j) => (
                    <SuggestionLine key={j} text={line} />
                  ))}
                </div>
              );
            })}

            <button
              onClick={async () => {
                setPdfLoading(true);
                setError("");
                try {
                  const res = await fetch('/api/field-trips-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subject, zip, distance, suggestions }),
                  });
                  if (!res.ok) throw new Error("Failed to generate PDF");
                  const html = await res.text();
                  const blob = new Blob([html], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const win = window.open(url, '_blank');
                  if (!win) {
                    // Popup blocked — fall back to download link
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `field-trips-${subject.replace(/\s+/g, '-').toLowerCase()}.html`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not generate PDF. Please try again.");
                } finally {
                  setPdfLoading(false);
                }
              }}
              disabled={pdfLoading}
              className="mt-6 w-full py-2 px-4 rounded-xl border border-[#4a9d8f] text-[#1a5c5a] font-medium hover:bg-[#f0faf9] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {pdfLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#5b8f8a] border-t-transparent rounded-full animate-spin" />
                  Preparing PDF...
                </span>
              ) : (
                "Download as PDF"
              )}
            </button>

            {/* Search again nudge */}
            <div className="pt-4 text-center">
              <button
                onClick={() => {
                  setSuggestions([]);
                  setSubject("");
                  setZip("");
                  setDistance("25");
                  setResetKey((k) => k + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-sm text-[#1a5c5a] hover:underline font-medium"
              >
                ← Search for another unit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
