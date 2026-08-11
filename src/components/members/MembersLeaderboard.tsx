import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trophy, Star, Loader2, User } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Member {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_xp: number;
  current_level: string;
  streak_days: number;
}

const LEVELS = ['Novice', 'Explorer', 'Adventurer', 'Champion', 'Legend'];
const RANK_COLORS = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
const RANK_BG = ['bg-yellow-500/10', 'bg-slate-400/10', 'bg-amber-600/10'];

function levelColor(level: string) {
  switch (level) {
    case 'Legend': return 'text-purple-500 bg-purple-500/10';
    case 'Champion': return 'text-blue-500 bg-blue-500/10';
    case 'Adventurer': return 'text-[var(--accent)] bg-[var(--accent)]/10';
    case 'Explorer': return 'text-green-500 bg-green-500/10';
    default: return 'text-[var(--foreground-muted)] bg-[var(--background-secondary)]';
  }
}

export default function MembersLeaderboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setCurrentUserId(data.session?.user?.id ?? null)
    );
  }, []);

  useEffect(() => {
    async function fetchLeaderboard() {
      const { data, error: err } = await supabase
        .from('user_xp')
        .select('user_id, total_xp, current_level, streak_days, profiles(username, avatar_url)')
        .order('total_xp', { ascending: false })
        .limit(50);

      if (err) {
        setError(err.message);
      } else {
        const rows: Member[] = (data ?? []).map((row: any) => ({
          user_id: row.user_id,
          username: row.profiles?.username ?? null,
          avatar_url: row.profiles?.avatar_url ?? null,
          total_xp: row.total_xp,
          current_level: row.current_level,
          streak_days: row.streak_days,
        }));
        setMembers(rows);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">
        Unable to load leaderboard — {error}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="py-16 text-center">
        <Trophy size={40} className="mx-auto text-[var(--foreground-subtle)] mb-3" />
        <p className="text-[var(--foreground-muted)] text-sm">No members on the leaderboard yet.</p>
        <p className="text-xs text-[var(--foreground-subtle)] mt-1">
          Be the first — <a href="/auth" className="text-[var(--accent)] hover:underline">create an account</a> and start collecting pins.
        </p>
      </div>
    );
  }

  // Top 3 podium
  const top3 = members.slice(0, 3);
  const rest = members.slice(3);

  return (
    <div className="flex flex-col gap-8">
      {/* Podium */}
      {top3.length >= 1 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {/* 2nd */}
          <div className={`rounded-2xl border p-4 text-center flex flex-col items-center gap-2 ${top3[1] ? 'opacity-100' : 'opacity-0'} border-[var(--border)] bg-[var(--background)]`}>
            {top3[1] && (
              <>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400/30 to-slate-400/10 flex items-center justify-center text-lg font-bold text-slate-400">
                  {(top3[1].username ?? '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate max-w-[5rem]">{top3[1].username ?? 'Member'}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{top3[1].total_xp.toLocaleString()} XP</p>
                </div>
                <span className="text-2xl font-black text-slate-400">#2</span>
              </>
            )}
          </div>

          {/* 1st */}
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-center flex flex-col items-center gap-2 ring-2 ring-yellow-500/20">
            <Trophy size={14} className="text-yellow-500 mb-0.5" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500/30 to-yellow-500/10 flex items-center justify-center text-2xl font-bold text-yellow-500">
              {(top3[0].username ?? '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)] truncate max-w-[5rem]">{top3[0].username ?? 'Member'}</p>
              <p className="text-xs text-[var(--foreground-muted)]">{top3[0].total_xp.toLocaleString()} XP</p>
            </div>
            <span className="text-2xl font-black text-yellow-500">#1</span>
          </div>

          {/* 3rd */}
          <div className={`rounded-2xl border p-4 text-center flex flex-col items-center gap-2 ${top3[2] ? 'opacity-100' : 'opacity-0'} border-[var(--border)] bg-[var(--background)]`}>
            {top3[2] && (
              <>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600/30 to-amber-600/10 flex items-center justify-center text-lg font-bold text-amber-600">
                  {(top3[2].username ?? '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate max-w-[5rem]">{top3[2].username ?? 'Member'}</p>
                  <p className="text-xs text-[var(--foreground-muted)]">{top3[2].total_xp.toLocaleString()} XP</p>
                </div>
                <span className="text-2xl font-black text-amber-600">#3</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full list */}
      {rest.length > 0 && (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {rest.map((member, i) => {
            const rank = i + 4;
            const isMe = member.user_id === currentUserId;

            return (
              <div
                key={member.user_id}
                className={[
                  'flex items-center gap-3 py-3',
                  isMe ? 'rounded-xl px-3 bg-[var(--accent)]/5 border border-[var(--accent)]/20 -mx-3 my-1' : '',
                ].join(' ')}
              >
                <span className="w-6 text-center text-xs font-bold text-[var(--foreground-subtle)]">
                  {rank}
                </span>
                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                  {(member.username ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                    {member.username ?? 'Member'}
                    {isMe && <span className="ml-1.5 text-xs font-normal text-[var(--accent)]">(you)</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${levelColor(member.current_level)}`}>
                      {member.current_level}
                    </span>
                    {member.streak_days > 0 && (
                      <span className="text-xs text-[var(--foreground-subtle)]">
                        🔥 {member.streak_days}d streak
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--foreground)]">{member.total_xp.toLocaleString()}</p>
                  <p className="text-xs text-[var(--foreground-subtle)]">XP</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-[var(--foreground-subtle)]">
        Showing top {members.length} members · XP earned from check-ins, streaks, and achievements
      </p>
    </div>
  );
}
