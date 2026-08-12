export const prerender = false;

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  // --- Verify the caller's session ---
  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);

  const anonClient = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // --- Parse body ---
  let couponId: string;
  try {
    const body = await request.json();
    couponId = body.couponId;
    if (!couponId || typeof couponId !== 'string') throw new Error();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  // --- Call the atomic DB function via service role ---
  const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
    return json({ error: 'Server configuration error' }, 500);
  }

  const serviceClient = createClient(import.meta.env.PUBLIC_SUPABASE_URL, serviceKey);

  const { data: code, error: redeemError } = await serviceClient.rpc('redeem_coupon', {
    p_user_id: user.id,
    p_coupon_id: couponId,
  });

  if (redeemError) {
    const msg = redeemError.message ?? 'Redemption failed';
    const status =
      msg.includes('Unauthorized') ? 401
      : msg.includes('Not enough XP') || msg.includes('Sold out') || msg.includes('Already redeemed') || msg.includes('expired') ? 400
      : 500;
    return json({ error: msg }, status);
  }

  return json({ code });
};
