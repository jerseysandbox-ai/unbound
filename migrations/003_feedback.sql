-- Early adopter feedback table
create table if not exists public.unbound_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.unbound_users(id) on delete set null,
  plan_id text not null,
  rating text not null check (rating in ('up', 'down')),
  comment text check (char_length(comment) <= 140),
  grade_level text,
  subjects text,
  created_at timestamptz default now()
);
alter table public.unbound_feedback enable row level security;
create policy "Users insert own feedback" on public.unbound_feedback for insert with check (auth.uid() = user_id);
create policy "Admins read all feedback" on public.unbound_feedback for select using (auth.email() in ('matthewnbrown@gmail.com', 'nicoleannenewman@gmail.com'));
