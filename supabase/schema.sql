-- ============================================================
-- Exhale — Supabase schema
-- Run this ONCE in the Supabase dashboard: SQL Editor → New query
-- ============================================================

-- 1. User profiles: one row per auth user, auto-created on signup.
--    Readable/writable only by the owner (RLS).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  products jsonb default '[]',
  quit_mode text,
  quit_date timestamptz,
  program_start_date timestamptz,
  quit_reasons jsonb default '[]',
  quit_reason_text text,
  baseline_per_day numeric,
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "update own profile"
  on public.profiles for update using (auth.uid() = id);

-- 2. Subscriptions: premium entitlement (SOS access, $3.99/mo).
--    Users can READ their own row; ONLY the service role (Stripe webhook)
--    can write — there are no insert/update policies on purpose.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'inactive', -- 'active' | 'inactive'
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_stripe_sub
  on public.subscriptions (stripe_subscription_id);

alter table public.subscriptions enable row level security;

create policy "read own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- 3. Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
