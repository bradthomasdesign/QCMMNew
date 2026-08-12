-- ============================================================
-- Gamification: Phase 1 migration
-- Run in: Supabase dashboard → SQL Editor
-- ============================================================

-- --------------------------------------------------------
-- 1. Extend locations with static-content slug references
-- --------------------------------------------------------

alter table locations
  add column if not exists character_slugs text[] not null default '{}',
  add column if not exists collection_slugs text[] not null default '{}';

-- --------------------------------------------------------
-- 2. User badges  (one row per collection completed)
-- --------------------------------------------------------

create table if not exists user_badges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  collection_slug text not null,
  awarded_at    timestamptz not null default now(),
  unique (user_id, collection_slug)
);

alter table user_badges enable row level security;

-- Users can read only their own badges
create policy "user_badges: own read"
  on user_badges for select
  using (auth.uid() = user_id);

-- No client-side inserts; badges are awarded by an API route / edge function
-- (service role key only)

-- --------------------------------------------------------
-- 3. User characters  (one row per character discovered)
-- --------------------------------------------------------

create table if not exists user_characters (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  character_slug  text not null,
  location_id     uuid not null references locations(id) on delete cascade,
  discovered_at   timestamptz not null default now(),
  unique (user_id, character_slug)
);

alter table user_characters enable row level security;

create policy "user_characters: own read"
  on user_characters for select
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 4. Coupons  (admin-managed; code pool held server-side)
-- --------------------------------------------------------

create table if not exists coupons (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  point_cost    integer not null check (point_cost > 0),
  -- code_pool is only ever read by server-side routes, never exposed to clients
  code_pool     text[] not null default '{}',
  expires_at    timestamptz,
  total_limit   integer,           -- null = unlimited
  per_user_limit integer not null default 1,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table coupons enable row level security;

-- Public can read metadata but NOT the code pool
create policy "coupons: public read (no codes)"
  on coupons for select
  using (
    active = true
    and (expires_at is null or expires_at > now())
  );

-- Prevent the code_pool column from ever being returned to clients via RLS
-- (the API route uses the service role key which bypasses RLS anyway,
--  but this is defence-in-depth for anon/user reads)
create policy "coupons: block code_pool via column security"
  on coupons for select
  using (false);   -- overridden by the policy above; combined they grant non-pool cols only

-- Note: column-level security on code_pool is the right tool here.
-- Add it via: GRANT SELECT (id, title, description, point_cost, expires_at,
--   total_limit, per_user_limit, active, created_at) ON coupons TO authenticated, anon;
-- and revoke the broad grant if Supabase added one.

-- --------------------------------------------------------
-- 5. Coupon redemptions
-- --------------------------------------------------------

create table if not exists coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  coupon_id   uuid not null references coupons(id) on delete restrict,
  code        text not null,
  redeemed_at timestamptz not null default now(),
  unique (user_id, coupon_id)   -- enforces per_user_limit=1 at the DB level
);

alter table coupon_redemptions enable row level security;

create policy "coupon_redemptions: own read"
  on coupon_redemptions for select
  using (auth.uid() = user_id);

-- --------------------------------------------------------
-- 6. Column-level grants  (run after the tables exist)
--    Removes code_pool from what anon/authenticated can SELECT.
-- --------------------------------------------------------

-- Revoke the broad table grant Supabase may have added
revoke select on coupons from anon, authenticated;

-- Re-grant only the safe columns
grant select (
  id, title, description, point_cost,
  expires_at, total_limit, per_user_limit, active, created_at
) on coupons to anon, authenticated;
