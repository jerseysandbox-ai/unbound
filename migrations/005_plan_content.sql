-- Migration 005: persist full plan content to Supabase
-- Adds columns to store teacher/student plan HTML and KV session reference

alter table public.unbound_plans
  add column if not exists kv_session_id text,
  add column if not exists teacher_plan text,
  add column if not exists student_plan text,
  add column if not exists subjects text;

-- Index for fast lookup by kv_session_id (used for KV fallback on plan page)
create index if not exists idx_unbound_plans_kv_session_id
  on public.unbound_plans (kv_session_id);

-- Allow users to read their own plans
create policy if not exists "Users read own plans" on public.unbound_plans
  for select using (auth.uid() = user_id);
