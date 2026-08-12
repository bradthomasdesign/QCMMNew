import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapPin, CheckCircle2, Loader2, Lock, LogIn, Star, Zap } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

type State = 'loading' | 'no-token' | 'not-found' | 'need-auth' | 'already-checked-in' | 'ready' | 'checking-in' | 'success' | 'error';

interface Location {
  id: string;
  name: string;
  description: string | null;
  difficulty_level: number | null;
  is_secret: boolean;
  reward_description: string | null;
  character_slugs: string[];
}

function difficultyLabel(level: number | null) {
  if (!level) return null;
  return ['', 'Easy', 'Moderate', 'Hard', 'Expert', 'Legendary'][level] ?? null;
}

const XP_PER_CHECKIN = 50;

export default function CheckInFlow() {
  const [state, setState] = useState<State>('loading');
  const [location, setLocation] = useState<Location | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('t') ?? '';
    setToken(t);

    async function init() {
      if (!t) { setState('no-token'); return; }

      const [{ data: session }, { data: locs, error: locErr }] = await Promise.all([
        supabase.auth.getSession(),
        supabase
          .from('locations')
          .select('id, name, description, difficulty_level, is_secret, reward_description, character_slugs')
          .eq('qr_token', t)
          .eq('is_active', true)
          .single(),
      ]);

      const currentUser = session.session?.user ?? null;
      setUser(currentUser);

      if (locErr || !locs) { setState('not-found'); return; }
      setLocation(locs);

      if (!currentUser) { setState('need-auth'); return; }

      // Check if already pinned
      const { data: existing } = await supabase
        .from('pins')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('location_id', locs.id)
        .maybeSingle();

      setState(existing ? 'already-checked-in' : 'ready');
    }

    init();
  }, []);

  async function handleCheckIn() {
    if (!user || !location) return;
    setState('checking-in');

    const { error } = await supabase.from('pins').insert({
      user_id: user.id,
      location_id: location.id,
    });

    if (error) {
      setErrorMsg(error.message);
      setState('error');
    } else {
      // Fire XP award and character discoveries without awaiting
      supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_action: 'checkin',
        p_xp_amount: XP_PER_CHECKIN,
        p_description: `Checked in at ${location.name}`,
      }).catch(() => {});

      if (location.character_slugs?.length > 0) {
        supabase.from('user_characters').upsert(
          location.character_slugs.map(slug => ({ user_id: user.id, character_slug: slug, location_id: location.id })),
          { onConflict: 'user_id,character_slug', ignoreDuplicates: true },
        ).catch(() => {});
      }

      setState('success');
    }
  }

  // ─── States ───────────────────────────────────────────────────────────────

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <Loader2 size={32} className="animate-spin text-[var(--accent)]" />
        <p className="text-sm text-[var(--foreground-muted)]">Loading location…</p>
      </div>
    );
  }

  if (state === 'no-token') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--background-secondary)] flex items-center justify-center">
          <MapPin size={24} className="text-[var(--foreground-muted)]" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--foreground)] mb-1">No location found</h2>
          <p className="text-sm text-[var(--foreground-muted)]">Visit a location page to check in.</p>
        </div>
        <a href="/locations" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
          Browse Locations
        </a>
      </div>
    );
  }

  if (state === 'not-found') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--error-light)] flex items-center justify-center">
          <MapPin size={24} className="text-[var(--destructive)]" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--foreground)] mb-1">Location not found</h2>
          <p className="text-sm text-[var(--foreground-muted)]">This link doesn't match an active QCMM location.</p>
        </div>
        <a href="/locations" className="text-sm text-[var(--accent)] hover:underline">Browse all locations</a>
      </div>
    );
  }

  if (state === 'need-auth') {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        {location && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
              {location.is_secret ? <Lock size={24} className="text-[var(--accent)]" /> : <MapPin size={24} className="text-[var(--accent)]" />}
            </div>
            <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">{location.name}</h2>
            {location.description && <p className="text-sm text-[var(--foreground-muted)] max-w-xs">{location.description}</p>}
          </div>
        )}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 w-full max-w-sm flex flex-col gap-3">
          <LogIn size={20} className="mx-auto text-[var(--accent)]" />
          <p className="font-semibold text-[var(--foreground)]">Sign in to collect this pin</p>
          <p className="text-xs text-[var(--foreground-muted)]">You need a QCMM account to check in and earn XP.</p>
          <a
            href={`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
            className="block rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors text-center"
          >
            Sign In / Create Account
          </a>
        </div>
      </div>
    );
  }

  if (state === 'already-checked-in') {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-[var(--accent)]" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--foreground)] mb-1">{location?.name}</h2>
          <p className="text-[var(--foreground-muted)] text-sm">You've already collected this pin!</p>
        </div>
        <div className="flex gap-3">
          <a href="/locations" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)]/50 transition-colors">
            Find More Locations
          </a>
          <a href="/members" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
            View Leaderboard
          </a>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
            <CheckCircle2 size={40} className="text-[var(--accent)]" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-md">
            <Star size={13} className="text-white fill-white" />
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--foreground)] mb-1">Pin collected!</h2>
          <p className="text-[var(--foreground-muted)]">{location?.name}</p>
        </div>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-6 py-3 flex items-center gap-2">
          <Zap size={16} className="text-yellow-500" />
          <span className="text-sm font-semibold text-[var(--foreground)]">+{XP_PER_CHECKIN} XP earned</span>
        </div>
        {location?.reward_description && (
          <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-5 py-3 max-w-xs text-sm text-[var(--foreground-muted)]">
            <span className="font-semibold text-[var(--accent)]">Reward: </span>{location.reward_description}
          </div>
        )}
        <div className="flex gap-3">
          <a href="/locations" className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)]/50 transition-colors">
            Find More
          </a>
          <a href="/members" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
            Leaderboard
          </a>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--error-light)] flex items-center justify-center">
          <MapPin size={24} className="text-[var(--destructive)]" />
        </div>
        <div>
          <h2 className="font-semibold text-[var(--foreground)] mb-1">Check-in failed</h2>
          <p className="text-sm text-[var(--foreground-muted)]">{errorMsg}</p>
        </div>
        <button onClick={() => setState('ready')} className="text-sm text-[var(--accent)] hover:underline">Try again</button>
      </div>
    );
  }

  // state === 'ready' | 'checking-in'
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
        {location?.is_secret ? <Lock size={28} className="text-[var(--accent)]" /> : <MapPin size={28} className="text-[var(--accent)]" />}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">{location?.name}</h2>
        {location?.description && <p className="text-sm text-[var(--foreground-muted)] max-w-xs mx-auto">{location.description}</p>}
        {location?.difficulty_level && (
          <p className="text-xs text-[var(--foreground-subtle)] mt-1">{difficultyLabel(location.difficulty_level)} difficulty</p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-5 py-3 flex items-center gap-2">
        <Zap size={14} className="text-[var(--accent)]" />
        <span className="text-sm text-[var(--foreground-muted)]">Earn <strong className="text-[var(--foreground)]">+{XP_PER_CHECKIN} XP</strong> for this check-in</span>
      </div>

      <button
        onClick={handleCheckIn}
        disabled={state === 'checking-in'}
        className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-8 py-3.5 text-base font-bold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors shadow-[var(--theme-shadow-lg)]"
      >
        {state === 'checking-in' ? (
          <><Loader2 size={18} className="animate-spin" /> Checking in…</>
        ) : (
          <><CheckCircle2 size={18} /> Collect This Pin</>
        )}
      </button>

      <a href={`/locations`} className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
        Browse all locations
      </a>
    </div>
  );
}
