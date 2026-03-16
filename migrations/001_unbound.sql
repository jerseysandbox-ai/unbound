-- Unbound database migration
-- Run this in Supabase SQL editor: https://supabase.com/dashboard/project/wwsrtkvjkshzebgzikqr/sql

-- Users table (extends Supabase auth.users)
create table if not exists public.unbound_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  free_plan_used boolean default false,
  plans_created integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Plans table
create table if not exists public.unbound_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.unbound_users(id) on delete cascade,
  payment_intent_id text,
  child_nickname text,
  grade_level text,
  created_at timestamptz default now(),
  plan_summary text
);

-- RLS
alter table public.unbound_users enable row level security;
alter table public.unbound_plans enable row level security;

-- Policies
drop policy if exists "Users read own data" on public.unbound_users;
drop policy if exists "Users read own plans" on public.unbound_plans;

create policy "Users read own data" on public.unbound_users
  for select using (auth.uid() = id);

create policy "Users read own plans" on public.unbound_plans
  for select using (auth.uid() = user_id);

-- Auto-create unbound_users row on Supabase Auth signup
create or replace function public.handle_new_unbound_user()
returns trigger as $$
begin
  insert into public.unbound_users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_unbound on auth.users;

create trigger on_auth_user_created_unbound
  after insert on auth.users
  for each row execute procedure public.handle_new_unbound_user();
