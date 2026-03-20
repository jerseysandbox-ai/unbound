-- Migration 002: Stripe subscription support
-- Run this in Supabase SQL editor:
-- https://supabase.com/dashboard/project/wwsrtkvjkshzebgzikqr/sql
--
-- Changes:
--   1. Add Stripe/subscription columns to unbound_users
--   2. Add plans_used counter (replaces free_plan_used boolean for free tier)

-- Add subscription columns to unbound_users
alter table public.unbound_users
  add column if not exists stripe_customer_id text,
  add column if not exists subscription_status text not null default 'free',
  add column if not exists subscription_plan text,
  add column if not exists subscription_period_end timestamptz,
  -- plans_used tracks lifetime plans generated; free tier allows up to 4
  add column if not exists plans_used integer not null default 0;

-- Migrate existing free_plan_used data: users who already used their free plan
-- get plans_used = 1 so they're not locked out of the remaining 3 free plans
update public.unbound_users
  set plans_used = 1
  where free_plan_used = true and plans_used = 0;

-- Ensure subscription_status only accepts valid values
alter table public.unbound_users
  drop constraint if exists unbound_users_subscription_status_check;

alter table public.unbound_users
  add constraint unbound_users_subscription_status_check
  check (subscription_status in ('free', 'active', 'canceled', 'past_due'));

-- Ensure subscription_plan only accepts valid values (or null for free users)
alter table public.unbound_users
  drop constraint if exists unbound_users_subscription_plan_check;

alter table public.unbound_users
  add constraint unbound_users_subscription_plan_check
  check (subscription_plan is null or subscription_plan in ('monthly', 'annual'));

-- Update the new-user trigger to initialize new columns with sensible defaults
create or replace function public.handle_new_unbound_user()
returns trigger as $$
begin
  insert into public.unbound_users (id, email, subscription_status, plans_used)
  values (new.id, new.email, 'free', 0)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ── Helper RPC: safely increment plans_used ───────────────────────────────────
-- Called from generate-outline after a free session outline is created.
-- Using a dedicated function prevents race conditions (atomic increment).
create or replace function public.increment_plans_used(user_id uuid)
returns void as $$
begin
  update public.unbound_users
    set plans_used = plans_used + 1,
        updated_at = now()
    where id = user_id;
end;
$$ language plpgsql security definer;
