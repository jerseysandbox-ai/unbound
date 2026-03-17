/**
 * Next.js middleware (proxy.ts) — refreshes Supabase auth session and protects routes.
 *
 * Page routes: redirect unauthenticated users to /login.
 * API routes: return 401 JSON if not authenticated.
 *
 * Public (no auth required):
 *   /, /login, /signup, /confirm, /privacy, /reset-password, /api/webhook/stripe
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Page routes that require authentication — redirect to /login if not authed
const PROTECTED_PAGE_PREFIXES = [
  "/profile",
  "/checkout",
  "/generating",
  "/outline",
  "/plan",
];

// API routes that require authentication — return 401 if not authed
const PROTECTED_API_PREFIXES = [
  "/api/generate-outline",
  "/api/generate-full-plan",
  "/api/check-free-plan",
  "/api/get-outline/",
  "/api/get-plan/",
  "/api/plan-status/",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — must call getUser() to keep it alive
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Protected API routes — return 401 if unauthenticated ───────────────
  if (PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return supabaseResponse;
  }

  // ── Protected page routes — redirect to /login if unauthenticated ──────
  if (PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
