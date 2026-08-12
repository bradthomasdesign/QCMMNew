import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Zap, Gift, CheckCircle2, Loader2, Copy, Check, Clock } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Coupon {
  id: string;
  title: string;
  description: string | null;
  point_cost: number;
  expires_at: string | null;
  total_limit: number | null;
  per_user_limit: number;
  active: boolean;
}

interface Redemption {
  coupon_id: string;
  code: string;
  redeemed_at: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      title="Copy code"
      className="ml-2 rounded p-1 text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export default function RewardsCatalog() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [userXP, setUserXP] = useState<number | null>(null);
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-coupon redeem state: 'idle' | 'confirming' | 'redeeming' | 'done' | 'error'
  const [redeemState, setRedeemState] = useState<Record<string, string>>({});
  const [redeemError, setRedeemError] = useState<Record<string, string>>({});
  const [newCodes, setNewCodes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      const userId = session?.user.id ?? null;
      setAuthed(!!userId);
      setToken(session?.access_token ?? null);

      const { data: couponData } = await supabase
        .from('coupons')
        .select('id, title, description, point_cost, expires_at, total_limit, per_user_limit, active')
        .eq('active', true)
        .order('point_cost');

      setCoupons(couponData ?? []);

      if (userId) {
        const [xpRes, redRes] = await Promise.all([
          supabase.from('user_xp').select('total_xp').eq('user_id', userId).maybeSingle(),
          supabase.from('coupon_redemptions').select('coupon_id, code, redeemed_at').eq('user_id', userId),
        ]);
        setUserXP(xpRes.data?.total_xp ?? 0);
        setRedemptions(redRes.data ?? []);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function redeem(couponId: string) {
    if (!token) return;
    setRedeemState((s) => ({ ...s, [couponId]: 'redeeming' }));
    setRedeemError((e) => ({ ...e, [couponId]: '' }));

    const res = await fetch('/api/redeem-coupon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ couponId }),
    });

    const body = await res.json();

    if (!res.ok) {
      setRedeemError((e) => ({ ...e, [couponId]: body.error ?? 'Redemption failed.' }));
      setRedeemState((s) => ({ ...s, [couponId]: 'error' }));
      return;
    }

    const code: string = body.code;
    setNewCodes((c) => ({ ...c, [couponId]: code }));
    setRedemptions((r) => [...r, { coupon_id: couponId, code, redeemed_at: new Date().toISOString() }]);
    setUserXP((xp) => (xp !== null ? xp - (coupons.find((c) => c.id === couponId)?.point_cost ?? 0) : xp));
    setRedeemState((s) => ({ ...s, [couponId]: 'done' }));
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="py-16 text-center text-[var(--foreground-muted)]">
        <Gift size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">No rewards available right now. Check back soon.</p>
      </div>
    );
  }

  const redeemedIds = new Set(redemptions.map((r) => r.coupon_id));

  return (
    <div className="flex flex-col gap-8">
      {/* XP balance */}
      {authed && userXP !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-5 py-4">
          <Zap size={18} className="text-[var(--accent)] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {userXP.toLocaleString()} XP available
            </p>
            <p className="text-xs text-[var(--foreground-muted)]">Earn more by checking in at locations.</p>
          </div>
        </div>
      )}

      {/* Coupon grid */}
      <div className="flex flex-col gap-4">
        {coupons.map((coupon) => {
          const alreadyRedeemed = redeemedIds.has(coupon.id);
          const existingCode = redemptions.find((r) => r.coupon_id === coupon.id)?.code;
          const newCode = newCodes[coupon.id];
          const code = newCode ?? existingCode;
          const state = redeemState[coupon.id] ?? (alreadyRedeemed ? 'done' : 'idle');
          const canAfford = authed && userXP !== null && userXP >= coupon.point_cost;
          const expired = coupon.expires_at ? new Date(coupon.expires_at) < new Date() : false;

          return (
            <div
              key={coupon.id}
              className={[
                'rounded-xl border p-5 transition-colors',
                alreadyRedeemed
                  ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5'
                  : 'border-[var(--border)] bg-[var(--background)]',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-[var(--foreground)]">{coupon.title}</h3>
                    {alreadyRedeemed && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={10} /> Redeemed
                      </span>
                    )}
                    {expired && !alreadyRedeemed && (
                      <span className="text-[10px] font-bold text-[var(--foreground-muted)] bg-[var(--background-secondary)] px-2 py-0.5 rounded-full">
                        Expired
                      </span>
                    )}
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-[var(--foreground-muted)] leading-relaxed">
                      {coupon.description}
                    </p>
                  )}
                  {coupon.expires_at && !expired && (
                    <p className="mt-1.5 text-xs text-[var(--foreground-muted)] flex items-center gap-1">
                      <Clock size={11} />
                      Expires {new Date(coupon.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-[var(--foreground)]">
                    {coupon.point_cost.toLocaleString()}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]">XP</p>
                </div>
              </div>

              {/* Code display */}
              {code && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--accent)]/20 bg-[var(--background-secondary)] px-4 py-2.5">
                  <p className="text-sm font-mono font-semibold text-[var(--foreground)] flex-1 select-all">
                    {code}
                  </p>
                  <CopyButton text={code} />
                </div>
              )}

              {/* Action */}
              {!alreadyRedeemed && !expired && authed && (
                <div className="mt-4">
                  {state === 'idle' && (
                    <button
                      disabled={!canAfford}
                      onClick={() => setRedeemState((s) => ({ ...s, [coupon.id]: 'confirming' }))}
                      className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {canAfford ? 'Redeem' : `Need ${(coupon.point_cost - (userXP ?? 0)).toLocaleString()} more XP`}
                    </button>
                  )}

                  {state === 'confirming' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm text-[var(--foreground-muted)]">
                        Spend <strong>{coupon.point_cost.toLocaleString()} XP</strong> on this reward?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => redeem(coupon.id)}
                          className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setRedeemState((s) => ({ ...s, [coupon.id]: 'idle' }))}
                          className="rounded-lg border border-[var(--border)] px-4 py-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {state === 'redeeming' && (
                    <div className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                      <Loader2 size={14} className="animate-spin" /> Redeeming…
                    </div>
                  )}

                  {state === 'error' && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm text-red-500">{redeemError[coupon.id]}</p>
                      <button
                        onClick={() => setRedeemState((s) => ({ ...s, [coupon.id]: 'idle' }))}
                        className="text-xs text-[var(--accent)] hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!authed && (
                <div className="mt-4">
                  <a
                    href="/auth"
                    className="text-sm text-[var(--accent)] hover:underline"
                  >
                    Sign in to redeem
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
