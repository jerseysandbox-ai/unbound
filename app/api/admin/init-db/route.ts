/**
 * POST /api/admin/init-db
 *
 * One-time database migration endpoint. Creates Unbound tables if they
 * don't exist. Protected by INIT_DB_SECRET env var.
 *
 * Call once after deployment: POST /api/admin/init-db
 * with header: x-init-secret: <INIT_DB_SECRET>
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Disabled in production — gate behind env var to prevent accidental re-runs
  if (process.env.ENABLE_INIT_DB !== "true") {
    return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
  }

  // Simple secret guard — not auth-based since auth tables don't exist yet
  const secret = request.headers.get("x-init-secret");
  if (!secret || secret !== process.env.INIT_DB_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const migrations = [
    // Users table extending auth.users
    `create table if not exists public.unbound_users (
      id uuid references auth.users(id) on delete cascade primary key,
      email text not null,
      free_plan_used boolean default false,
      plans_created integer default 0,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )`,

    // Plans table
    `create table if not exists public.unbound_plans (
      id uuid default gen_random_uuid() primary key,
      user_id uuid references public.unbound_users(id) on delete cascade,
      payment_intent_id text,
      child_nickname text,
      grade_level text,
      created_at timestamptz default now(),
      plan_summary text
    )`,

    // Enable RLS
    `alter table public.unbound_users enable row level security`,
    `alter table public.unbound_plans enable row level security`,

    // RLS policies — drop first in case they exist
    `drop policy if exists "Users read own data" on public.unbound_users`,
    `drop policy if exists "Users read own plans" on public.unbound_plans`,

    `create policy "Users read own data" on public.unbound_users
      for select using (auth.uid() = id)`,

    `create policy "Users read own plans" on public.unbound_plans
      for select using (auth.uid() = user_id)`,

    // Trigger to auto-create unbound_users row on signup
    `create or replace function public.handle_new_unbound_user()
    returns trigger as $$
    begin
      insert into public.unbound_users (id, email)
      values (new.id, new.email)
      on conflict (id) do nothing;
      return new;
    end;
    $$ language plpgsql security definer`,

    `drop trigger if exists on_auth_user_created_unbound on auth.users`,

    `create trigger on_auth_user_created_unbound
      after insert on auth.users
      for each row execute procedure public.handle_new_unbound_user()`,
  ];

  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of migrations) {
    const { error } = await supabase.rpc("exec_sql", { sql }).then(
      () => ({ error: null }),
      (e: unknown) => ({ error: e })
    );

    // Try direct query if rpc doesn't exist
    if (error) {
      // Use raw SQL via the REST API workaround
      results.push({ sql: sql.slice(0, 60) + "...", ok: false, error: String(error) });
    } else {
      results.push({ sql: sql.slice(0, 60) + "...", ok: true });
    }
  }

  return NextResponse.json({ results });
}
