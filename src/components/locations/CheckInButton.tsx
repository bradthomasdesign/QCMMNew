import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, Loader2, MapPin, Star, Zap } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

const XP_PER_CHECKIN = 50;

interface Props {
  locationId: string;
  locationName: string;
}

type State = 'loading' | 'not-authed' | 'ready' | 'checking-in' | 'success' | 'already-pinned' | 'error';

export default function CheckInButton({ locationId, locationName }: Props) {
  const [state, setState] = useState<State>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      if (!user) { setState('not-authed'); return; }
      setUserId(user.id);

      const { data: existing } = await supabase
        .from('pins')
        .select('id')
        .eq('user_id', user.id)
        .eq('location_id', locationId)
        .maybeSingle();

      setState(existing ? 'already-pinned' : 'ready');
    });
  }, [locationId]);

  async function handleCheckIn() {
    if (!userId) return;
    setState('checking-in');

    const { error } = await supabase.from('pins').insert({
      user_id: userId,
      location_id: locationId,
    });

    if (error) {
      setErrorMsg(error.message);
      setState('error');
      return;
    }

    await supabase.rpc('award_xp', {
      p_user_id: userId,
      p_action: 'checkin',
      p_xp_amount: XP_PER_CHECKIN,
      p_description: `Checked in at ${locationName}`,
    }).catch(() => {});

    setState('success');
  }

  if (state === 'loading') return null;

  if (state === 'not-authed') {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-center">
        <p className="text-sm text-[var(--foreground-muted)] mb-3">Sign in to collect this pin and earn XP.</p>
        <a
          href={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}
          className="block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Sign In to Check In
        </a>
      </div>
    );
  }

  if (state === 'already-pinned') {
    return (
      <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 flex items-center gap-3">
        <CheckCircle2 size={20} className="text-[var(--accent)] shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Pin collected!</p>
          <p className="text-xs text-[var(--foreground-muted)]">You've already checked in here.</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={20} className="text-yellow-500 shrink-0" />
          <p className="text-sm font-semibold text-[var(--foreground)]">Pin collected!</p>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-yellow-500" />
          <p className="text-xs text-[var(--foreground-muted)]">+{XP_PER_CHECKIN} XP earned</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <p className="text-sm text-red-500 mb-2">Check-in failed: {errorMsg}</p>
        <button onClick={() => setState('ready')} className="text-xs text-[var(--accent)] hover:underline">Try again</button>
      </div>
    );
  }

  return (
    <button
      onClick={handleCheckIn}
      disabled={state === 'checking-in'}
      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
    >
      {state === 'checking-in' ? (
        <><Loader2 size={16} className="animate-spin" /> Checking in…</>
      ) : (
        <><MapPin size={16} /> Collect This Pin</>
      )}
    </button>
  );
}
