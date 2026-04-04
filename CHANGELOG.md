## v0.5.1 — 2026-04-04

- Field trip results now render as clean labeled cards (no markdown symbols)
- Download as PDF button saves field trip results as a file
- Field trips saved to account history automatically after each search
- Field trip history section added to account page with Search Again links
- Fixed Turnstile using wrong keys (Tap Caps keys replaced with Unbound Learner keys)
- Turnstile token auto-resets on expiry so users must re-verify before submitting

# Changelog

All notable changes to Unbound are documented here.
Format: [Semantic Versioning](https://semver.org) — `vMAJOR.MINOR.PATCH`

---

## [v0.2.1] — 2026-03-21 (pending — staging)
### Security
- Profile field sanitization: all free-text fields capped at 300 chars, prompt injection patterns stripped before reaching Claude
- Auth gate added to `/api/plan-status/[id]` — unauthenticated requests return 401
- `userId` now stored on paid outlines in KV to prevent ownership bypass
- `init-stripe` is now idempotent — looks up existing products before creating new ones

### Infrastructure
- Three-tier environment setup: dev / staging / prod
- `dev` and `staging` branches created; staging.unboundlearner.com live
- Doppler environments for dev and stg populated
- Doppler → Vercel sync for staging (Preview environment)
- All credentials rotated: Supabase scoped key, Anthropic keys (Unbound + PM Copilot), KV tokens
- `.env.local` wiped — no secrets on disk

---

## [v0.2.0] — 2026-03-20
### Features
- Stripe subscription integration (Monthly $19/mo, Annual $149/yr)
- Checkout session API (`/api/create-checkout-session`)
- Stripe webhook handler (`/api/stripe-webhook`)
- Pricing page (`/pricing`) with three tiers: Free (4 plans) / Core / Family
- Upgrade modal and banner for free-tier users approaching limit
- `stripe_customer_id`, `subscription_status`, `subscription_plan`, `subscription_period_end`, `plans_used` columns added to `unbound_users`
- Free tier: 4 plans before paywall

### Infrastructure
- GitHub repo connected to Vercel (auto-deploys on push to main)
- Doppler → Vercel sync for all 4 projects (unbound, bottlecaps, pm-copilot, proptechsolutions)
- Supabase project confirmed: `lbtozmvkcksiiayuchse`

---

## [v0.1.0] — 2026-03 (initial)
### Features
- AI-powered personalized lesson plan generation via Claude
- User auth (Supabase)
- Profile system (child name, interests, challenges, learning style)
- Plan generation with teacher guide + student worksheet PDFs
- Daily inspiration quote on each plan
- Wait screen with "sagacious scribe" character
- No markdown in PDFs — polished, human-readable output
- Cloudflare Turnstile bot protection
