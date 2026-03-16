"use client";

/**
 * /auth/confirm — Handles Supabase email confirmation callbacks.
 * Supabase redirects here after email verification and password reset.
 * Exchanges the URL token for a session, then redirects to the app.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthConfirmPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Supabase embeds the token in the URL hash or as query params
    // The SSR client picks it up automatically from the URL
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        router.replace("/profile");
      }
    });

    // Also handle the code exchange for PKCE flow
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error: exchangeError }) => {
          if (exchangeError) {
            setError(exchangeError.message);
          } else {
            router.replace("/profile");
          }
        });
    }
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-3">😔</div>
          <h1 className="text-xl font-bold text-[#2d2d2d] mb-2">Confirmation failed</h1>
          <p className="text-[#8a8580] text-sm mb-6">{error}</p>
          <a
            href="/login"
            className="inline-block bg-[#5b8f8a] text-white font-semibold px-6 py-3 rounded-xl"
          >
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-[#5b8f8a] font-medium">Confirming your account…</p>
      </div>
    </main>
  );
}
