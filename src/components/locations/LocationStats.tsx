import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Eye, UserCheck } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Props {
  locationId: string;
}

interface Stats {
  pageViews: number | null;
  lastUser: string | null;
  lastAt: string | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function LocationStats({ locationId }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [locRes, pinRes] = await Promise.all([
        supabase
          .from('locations')
          .select('page_views')
          .eq('id', locationId)
          .single(),
        supabase
          .from('pins')
          .select('pinned_at, profiles(username, full_name)')
          .eq('location_id', locationId)
          .order('pinned_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const pin = pinRes.data as any;
      const profile = pin?.profiles;
      const lastUser = profile?.username ?? profile?.full_name ?? null;

      setStats({
        pageViews: locRes.data?.page_views ?? null,
        lastUser,
        lastAt: pin?.pinned_at ?? null,
      });
    }
    load();
  }, [locationId]);

  if (!stats) return null;

  return (
    <div className="space-y-2.5">
      {stats.pageViews !== null && (
        <div className="flex items-center gap-2 text-sm">
          <Eye size={14} className="text-[var(--foreground-subtle)] shrink-0" />
          <span className="text-[var(--foreground-muted)]">Views</span>
          <span className="ml-auto text-xs text-[var(--foreground-muted)]">{stats.pageViews.toLocaleString()}</span>
        </div>
      )}
      {stats.lastUser && stats.lastAt && (
        <div className="flex items-center gap-2 text-sm">
          <UserCheck size={14} className="text-[var(--foreground-subtle)] shrink-0" />
          <span className="text-[var(--foreground-muted)] shrink-0">Last check-in</span>
          <span className="ml-auto text-xs text-[var(--foreground-muted)] text-right truncate max-w-[120px]" title={stats.lastUser}>
            {stats.lastUser} · {timeAgo(stats.lastAt)}
          </span>
        </div>
      )}
      {!stats.lastUser && (
        <div className="flex items-center gap-2 text-sm">
          <UserCheck size={14} className="text-[var(--foreground-subtle)] shrink-0" />
          <span className="text-[var(--foreground-muted)]">Last check-in</span>
          <span className="ml-auto text-xs text-[var(--foreground-muted)]">None yet</span>
        </div>
      )}
    </div>
  );
}
