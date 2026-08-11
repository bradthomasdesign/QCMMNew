import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, MapPin, Zap, Trophy, Star, Loader2, LogOut, Settings } from 'lucide-react';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Profile {
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface XP {
  total_xp: number;
  current_level: string;
  streak_days: number;
}

interface Pin {
  id: string;
  pinned_at: string;
  locations: { name: string; description: string | null } | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

export default function ProfileDashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [xp, setXP] = useState<XP | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pins' | 'badges'>('pins');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);

      if (!u) { setLoading(false); return; }

      const [profileRes, xpRes, pinsRes] = await Promise.all([
        supabase.from('profiles').select('username, full_name, bio, avatar_url').eq('user_id', u.id).maybeSingle(),
        supabase.from('user_xp').select('total_xp, current_level, streak_days').eq('user_id', u.id).maybeSingle(),
        supabase
          .from('pins')
          .select('id, pinned_at, locations(name, description)')
          .eq('user_id', u.id)
          .order('pinned_at', { ascending: false })
          .limit(50),
      ]);

      setProfile(profileRes.data ?? null);
      setXP(xpRes.data ?? null);
      setPins((pinsRes.data as unknown as Pin[]) ?? []);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) window.location.href = '/auth';
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <User size={32} className="text-[var(--foreground-muted)]" />
        <p className="text-[var(--foreground-muted)]">Sign in to view your profile.</p>
        <a href="/auth" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
          Sign In
        </a>
      </div>
    );
  }

  const displayName = profile?.full_name ?? profile?.username ?? user.email?.split('@')[0] ?? 'Explorer';
  const initials = displayName[0].toUpperCase();
  const level = xp?.current_level ?? 'Novice';
  const totalXP = xp?.total_xp ?? 0;
  const streak = xp?.streak_days ?? 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Profile header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent)]/10 flex items-center justify-center text-2xl font-bold text-[var(--accent)] shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--foreground)]">{displayName}</h2>
            {profile?.username && (
              <p className="text-sm text-[var(--foreground-muted)]">@{profile.username}</p>
            )}
            <p className="text-xs text-[var(--foreground-subtle)] mt-0.5">{user.email}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition-colors"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: MapPin, label: 'Pins', value: pins.length },
          { icon: Zap, label: 'XP', value: totalXP.toLocaleString() },
          { icon: Trophy, label: streak > 0 ? `${streak}d Streak` : 'Level', value: streak > 0 ? '🔥' : level },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-center">
            <Icon size={16} className="mx-auto text-[var(--accent)] mb-1.5" />
            <p className="text-lg font-bold text-[var(--foreground)]">{value}</p>
            <p className="text-xs text-[var(--foreground-muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Level badge */}
      <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3 flex items-center gap-3">
        <Star size={16} className="text-[var(--accent)] shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{level}</p>
          <p className="text-xs text-[var(--foreground-muted)]">{totalXP.toLocaleString()} total XP earned</p>
        </div>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
          {profile.bio}
        </p>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-[var(--border)] mb-4">
          {(['pins', 'badges'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-[var(--accent)] text-[var(--foreground)]'
                  : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
              ].join(' ')}
            >
              {tab}
              {tab === 'pins' && pins.length > 0 && (
                <span className="ml-1.5 text-xs rounded-full bg-[var(--accent)]/10 text-[var(--accent)] px-1.5 py-0.5">{pins.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'pins' && (
          pins.length === 0 ? (
            <div className="py-10 text-center">
              <MapPin size={28} className="mx-auto text-[var(--foreground-subtle)] mb-2" />
              <p className="text-sm text-[var(--foreground-muted)]">No pins yet.</p>
              <a href="/locations" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">
                Find your first location
              </a>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {pins.map((pin) => (
                <div key={pin.id} className="py-3 flex items-center gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <MapPin size={14} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {(pin.locations as any)?.name ?? 'Unknown Location'}
                    </p>
                    <p className="text-xs text-[var(--foreground-subtle)]">{timeAgo(pin.pinned_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'badges' && (
          <div className="py-10 text-center">
            <Trophy size={28} className="mx-auto text-[var(--foreground-subtle)] mb-2" />
            <p className="text-sm text-[var(--foreground-muted)]">No badges earned yet.</p>
            <p className="text-xs text-[var(--foreground-subtle)] mt-1">Check in at locations to start earning.</p>
          </div>
        )}
      </div>
    </div>
  );
}
