-- ============================================================
-- Atomic coupon redemption function
-- Run in: Supabase dashboard → SQL Editor
-- Run AFTER 20260812_gamification.sql
-- ============================================================

create or replace function redeem_coupon(
  p_user_id  uuid,
  p_coupon_id uuid
) returns text
language plpgsql
security definer   -- runs as owner, bypasses RLS
set search_path = public
as $$
declare
  v_code          text;
  v_cost          integer;
  v_expires_at    timestamptz;
  v_active        boolean;
  v_total_limit   integer;
  v_per_user_lim  integer;
  v_redeemed_cnt  integer;
  v_user_xp       integer;
begin
  -- Lock the coupon row for the duration of this transaction
  select point_cost, expires_at, active, total_limit, per_user_limit
    into v_cost, v_expires_at, v_active, v_total_limit, v_per_user_lim
    from coupons
   where id = p_coupon_id
     for update;

  if not found then
    raise exception 'Coupon not found';
  end if;

  if not v_active then
    raise exception 'Coupon is not active';
  end if;

  if v_expires_at is not null and v_expires_at < now() then
    raise exception 'Coupon has expired';
  end if;

  -- Per-user limit check
  select count(*) into v_redeemed_cnt
    from coupon_redemptions
   where coupon_id = p_coupon_id and user_id = p_user_id;

  if v_redeemed_cnt >= v_per_user_lim then
    raise exception 'Already redeemed';
  end if;

  -- Total limit check
  if v_total_limit is not null then
    select count(*) into v_redeemed_cnt
      from coupon_redemptions
     where coupon_id = p_coupon_id;

    if v_redeemed_cnt >= v_total_limit then
      raise exception 'Sold out';
    end if;
  end if;

  -- XP balance check (lock the row)
  select total_xp into v_user_xp
    from user_xp
   where user_id = p_user_id
     for update;

  if v_user_xp is null or v_user_xp < v_cost then
    raise exception 'Not enough XP';
  end if;

  -- Pop the first code from the pool
  select code_pool[1] into v_code
    from coupons
   where id = p_coupon_id and cardinality(code_pool) > 0;

  if v_code is null then
    raise exception 'No codes available';
  end if;

  update coupons
     set code_pool = code_pool[2:cardinality(code_pool)]
   where id = p_coupon_id;

  -- Deduct XP
  update user_xp
     set total_xp = total_xp - v_cost
   where user_id = p_user_id;

  -- Record the redemption
  insert into coupon_redemptions (user_id, coupon_id, code)
  values (p_user_id, p_coupon_id, v_code);

  return v_code;
end;
$$;

-- Only service-role can call this directly; anon/authenticated are denied
revoke execute on function redeem_coupon(uuid, uuid) from anon, authenticated;
