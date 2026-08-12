import { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, MapPin, Zap, Trophy, Star, Loader2, LogOut, Pencil, Check, X, Camera, Gift, Copy } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'pins' | 'badges' | 'rewards'>('pins');
  const [redemptions, setRedemptions] = useState<{ coupon_id: string; code: string; redeemed_at: string; title: string }[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) { setLoading(false); return; }

      const [profileRes, xpRes, pinsRes] = await Promise.all([
        supabase.from('profiles').select('username, full_name, bio, avatar_url').eq('user_id', u.id).maybeSingle(),
        supabase.from('user_xp').select('total_xp, current_level, streak_days').eq('user_id', u.id).maybeSingle(),
        supabase.from('pins').select('id, pinned_at, locations(name, description)').eq('user_id', u.id).order('pinned_at', { ascending: false }).limit(50),
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

  function startEdit() {
    setEditUsername(profile?.username ?? '');
    setEditBio(profile?.bio ?? '');
    setAvatarPreview(null);
    setAvatarFile(null);
    setSaveError('');
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setAvatarPreview(null);
    setAvatarFile(null);
    setSaveError('');
  }

  async function switchTab(tab: typeof activeTab) {
    setActiveTab(tab);
    if (tab === 'rewards' && redemptions === null && user) {
      const { data } = await supabase
        .from('coupon_redemptions')
        .select('coupon_id, code, redeemed_at, coupons(title)')
        .eq('user_id', user.id)
        .order('redeemed_at', { ascending: false });
      setRedemptions(
        (data ?? []).map((r: any) => ({
          coupon_id: r.coupon_id,
          code: r.code,
          redeemed_at: r.redeemed_at,
          title: r.coupons?.title ?? 'Reward',
        }))
      );
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setSaveError('');

    let avatarUrl = profile?.avatar_url ?? null;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });
      if (uploadErr) {
        setSaveError(uploadErr.message);
        setSaving(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = `${publicUrl}?t=${Date.now()}`;
    }

    const username = editUsername.trim() || null;
    const bio = editBio.trim() || null;

    const { error } = await supabase
      .from('profiles')
      .update({ username, bio, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (error) {
      setSaveError(error.message.includes('unique') ? 'That username is already taken.' : error.message);
      setSaving(false);
      return;
    }

    setProfile(prev => prev ? { ...prev, username, bio, avatar_url: avatarUrl } : null);
    setSaving(false);
    setEditing(false);
    setAvatarPreview(null);
    setAvatarFile(null);
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
  const avatarSrc = avatarPreview ?? profile?.avatar_url;

  return (
    <div className="flex flex-col gap-8">
      {/* Profile header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={displayName}
                className="w-16 h-16 rounded-full object-cover border-2 border-[var(--border)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent)]/10 flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
                {initials}
              </div>
            )}
            {editing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                title="Change avatar"
              >
                <Camera size={18} className="text-white" />
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Name / edit fields */}
          {editing ? (
            <div className="flex flex-col gap-2 flex-1">
              <input
                value={editUsername}
                onChange={e => setEditUsername(e.target.value)}
                placeholder="Username"
                maxLength={32}
                className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--input-focus)]"
              />
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                placeholder="Short bio…"
                maxLength={160}
                rows={2}
                className="rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--input-focus)] resize-none"
              />
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            </div>
          ) : (
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--foreground)]">{displayName}</h2>
              {profile?.username && (
                <p className="text-sm text-[var(--foreground-muted)]">@{profile.username}</p>
              )}
              <p className="text-xs text-[var(--foreground-subtle)] mt-0.5">{user.email}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
              >
                <Check size={12} />
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
              >
                <X size={12} /> Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition-colors"
              >
                <LogOut size={12} /> Sign Out
              </button>
            </>
          )}
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

      {/* Bio (read mode) */}
      {!editing && profile?.bio && (
        <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed border-t border-[var(--border)] pt-4">
          {profile.bio}
        </p>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-[var(--border)] mb-4">
          {(['pins', 'badges', 'rewards'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => switchTab(tab)}
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
              <a href="/locations" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">Find your first location</a>
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
            <p className="text-xs text-[var(--foreground-subtle)] mt-1">Complete a collection to earn your first badge.</p>
          </div>
        )}

        {activeTab === 'rewards' && (
          redemptions === null ? (
            <div className="flex justify-center py-10">
              <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
            </div>
          ) : redemptions.length === 0 ? (
            <div className="py-10 text-center">
              <Gift size={28} className="mx-auto text-[var(--foreground-subtle)] mb-2" />
              <p className="text-sm text-[var(--foreground-muted)]">No rewards redeemed yet.</p>
              <a href="/rewards" className="mt-2 inline-block text-sm text-[var(--accent)] hover:underline">Browse rewards</a>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--border)]">
              {redemptions.map((r) => (
                <div key={r.coupon_id} className="py-3 flex items-start gap-3">
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center mt-0.5">
                    <Gift size={14} className="text-[var(--accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{r.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <p className="text-xs font-mono text-[var(--foreground-muted)] select-all">{r.code}</p>
                      <button
                        onClick={() => copyCode(r.code)}
                        className="text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
                        title="Copy code"
                      >
                        {copiedCode === r.code ? <Check size={11} /> : <Copy size={11} />}
                      </button>
                    </div>
                    <p className="text-xs text-[var(--foreground-subtle)]">{timeAgo(r.redeemed_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
