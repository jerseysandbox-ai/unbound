"use client";

/**
 * /signup — Supabase email + password signup
 * Warm Unbound styling. On success shows confirmation message.
 */

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Redirect to /auth/confirm after clicking email link
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-[#2d2d2d] mb-2">Check your email</h1>
          <p className="text-[#8a8580] text-sm leading-relaxed mb-6">
            We sent a confirmation link to <strong className="text-[#2d2d2d]">{email}</strong>.
            Click the link to activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="inline-block bg-[#5b8f8a] hover:bg-[#3d6e69] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-[#5b8f8a] font-bold text-2xl tracking-tight">
            Unbound
          </Link>
          <h1 className="text-2xl font-bold text-[#2d2d2d] mt-4 mb-1">Create your account</h1>
          <p className="text-[#8a8580] text-sm">
            Your first plan is <span className="font-semibold text-[#5b8f8a]">completely free</span> 🎉
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e4e0] shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#e0dbd5] px-4 py-3 text-sm text-[#2d2d2d] placeholder:text-[#b0aba6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2d2d2d] mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#e0dbd5] px-4 py-3 text-sm text-[#2d2d2d] placeholder:text-[#b0aba6] focus:outline-none focus:ring-2 focus:ring-[#5b8f8a]"
                placeholder="At least 6 characters"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5b8f8a] hover:bg-[#3d6e69] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              {loading ? "Creating account…" : "Create free account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#8a8580] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[#5b8f8a] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
