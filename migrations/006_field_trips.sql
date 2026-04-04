-- Migration 006: field trip history
create table if not exists public.field_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  zip text not null,
  distance text not null,
  suggestions text not null, -- JSON array of suggestion strings
  created_at timestamptz default now()
);

alter table public.field_trips enable row level security;

create policy "Users read own field trips" on public.field_trips
  for select using (auth.uid() = user_id);

create policy "Users insert own field trips" on public.field_trips
  for insert with check (auth.uid() = user_id);

create index if not exists idx_field_trips_user_id on public.field_trips (user_id, created_at desc);
