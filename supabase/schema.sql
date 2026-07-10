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
  dob date,
  gender text,
  products jsonb default '[]',
  quit_mode text,
  quit_date timestamptz,
  program_start_date timestamptz,
  quit_reasons jsonb default '[]',
  quit_reason_text text,
  baseline_per_day numeric,
  currency text,
  -- Public URL of the profile photo stored in the "avatars" bucket.
  avatar_url text,
  -- Complete profile snapshot: lets a returning user restore on a new device
  -- instead of being re-onboarded (and overwriting this row with blanks).
  profile_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrading an existing table? Run just these:
-- alter table public.profiles
--   add column if not exists dob date,
--   add column if not exists gender text,
--   add column if not exists avatar_url text,
--   add column if not exists profile_json jsonb;

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

-- 4. Avatars bucket: public read, each user writes only their own <uid>.jpg.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatar owner write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] is null
    and name = auth.uid()::text || '.jpg'
  );

create policy "avatar owner update"
  on storage.objects for update
  using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

-- ============================================================
-- 5. Community — public country chat rooms.
--    Everything here is PUBLIC and deliberately separate from The Room,
--    which stays on-device and never touches the network.
-- ============================================================

-- 5a. Public identity: a nickname chosen once, unique across the app.
--     Kept apart from `profiles` so a real name is never published.
create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 20),
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness: "Nightshift" and "nightshift" are one name.
create unique index if not exists idx_community_profiles_name
  on public.community_profiles (lower(display_name));

alter table public.community_profiles enable row level security;

drop policy if exists "community profiles readable by all" on public.community_profiles;
create policy "community profiles readable by all"
  on public.community_profiles for select to authenticated using (true);
drop policy if exists "insert own community profile" on public.community_profiles;
create policy "insert own community profile"
  on public.community_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "update own community profile" on public.community_profiles;
create policy "update own community profile"
  on public.community_profiles for update to authenticated using (auth.uid() = user_id);

-- 5b. Messages. `room_code` is an ISO-3166 alpha-2 country code, or GLOBAL.
--     display_name / avatar_url are denormalized so rendering a room is a
--     single indexed read with no join.
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null check (room_code = 'GLOBAL' or room_code ~ '^[A-Z]{2}$'),
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_community_messages_room
  on public.community_messages (room_code, created_at desc);

alter table public.community_messages enable row level security;

drop policy if exists "messages readable by signed-in users" on public.community_messages;
create policy "messages readable by signed-in users"
  on public.community_messages for select to authenticated using (true);

-- Post only as yourself, and only under the nickname you actually own.
drop policy if exists "post own messages" on public.community_messages;
create policy "post own messages"
  on public.community_messages for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.community_profiles p
      where p.user_id = auth.uid() and p.display_name = display_name
    )
  );

drop policy if exists "delete own messages" on public.community_messages;
create policy "delete own messages"
  on public.community_messages for delete to authenticated using (auth.uid() = user_id);

-- 5c. Flood control: at most 5 messages per 20 seconds, enforced server-side
--     because a client-side limit protects nobody.
create or replace function public.community_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  recent integer;
begin
  select count(*) into recent
    from public.community_messages
   where user_id = new.user_id
     and created_at > now() - interval '20 seconds';
  if recent >= 5 then
    raise exception 'rate_limited' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists community_rate_limit_trigger on public.community_messages;
create trigger community_rate_limit_trigger
  before insert on public.community_messages
  for each row execute function public.community_rate_limit();

-- 5d. Blocks: "I never want to see this person again." Enforced client-side
--     on read; the row exists so the block survives a reinstall.
create table if not exists public.community_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.community_blocks enable row level security;

drop policy if exists "read own blocks" on public.community_blocks;
create policy "read own blocks"
  on public.community_blocks for select to authenticated using (auth.uid() = blocker_id);
drop policy if exists "create own blocks" on public.community_blocks;
create policy "create own blocks"
  on public.community_blocks for insert to authenticated with check (auth.uid() = blocker_id);
drop policy if exists "remove own blocks" on public.community_blocks;
create policy "remove own blocks"
  on public.community_blocks for delete to authenticated using (auth.uid() = blocker_id);

-- 5e. Reports. Insert-only for users; reviewed with the service role.
--     Google Play requires an in-app reporting path for user-generated content.
--     The reported text is SNAPSHOT here: if the author deletes the message,
--     the evidence must survive, so message_id nulls out instead of cascading.
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.community_messages (id) on delete set null,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  body_snapshot text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- One report per person per message (only while the message still exists).
create unique index if not exists idx_community_reports_once
  on public.community_reports (message_id, reporter_id)
  where message_id is not null;

alter table public.community_reports enable row level security;

drop policy if exists "file own reports" on public.community_reports;
create policy "file own reports"
  on public.community_reports for insert to authenticated with check (auth.uid() = reporter_id);

-- 5f. Live updates. Without this, rooms only refresh on pull-to-refresh.
--     Re-running the script must not fail on an already-published table.
do $$
begin
  alter publication supabase_realtime add table public.community_messages;
exception
  when duplicate_object then null;
end;
$$;

-- ============================================================
-- 6. Feedback: bug reports, ideas and complaints from Settings.
--    Insert-only for users; read it in the dashboard or with the service role.
--    Diagnostics are limited to app/OS version and language -- never logs,
--    never profile data, never anything from The Room.
-- ============================================================
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  email text,
  category text not null check (category in ('bug', 'idea', 'complaint', 'other')),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  app_version text,
  platform text,
  os_version text,
  language text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Users may file feedback as themselves, and read nothing back.
drop policy if exists "file own feedback" on public.feedback;
create policy "file own feedback"
  on public.feedback for insert to authenticated with check (auth.uid() = user_id);
