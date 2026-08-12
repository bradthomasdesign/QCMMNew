import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, Circle, MapPin } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Location {
  id: string;
  name: string;
  description: string | null;
  difficulty_level: number | null;
}

interface Props {
  locations: Location[];
}

const difficultyLabel: Record<number, string> = {
  1: 'Easy', 2: 'Moderate', 3: 'Hard', 4: 'Expert', 5: 'Legendary',
};

export default function CollectionLocationList({ locations }: Props) {
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [authed, setAuthed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (locations.length === 0) { setLoaded(true); return; }
    supabase.auth.getSession().then(async ({ data }) => {
      const userId = data.session?.user.id ?? null;
      setAuthed(!!userId);

      if (userId) {
        const { data: pins } = await supabase
          .from('pins')
          .select('location_id')
          .eq('user_id', userId)
          .in('location_id', locations.map((l) => l.id));
        setPinnedIds(new Set((pins ?? []).map((p: any) => p.location_id)));
      }
      setLoaded(true);
    });
  }, []);

  const checkedCount = pinnedIds.size;
  const total = locations.length;

  return (
    <div>
      {authed && loaded && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              {checkedCount} of {total} checked in
            </span>
            {checkedCount === total && (
              <span className="text-xs font-semibold text-[var(--accent)] flex items-center gap-1">
                <CheckCircle2 size={12} /> Complete!
              </span>
            )}
          </div>
          <div className="h-2 rounded-full bg-[var(--background-secondary)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: total > 0 ? `${(checkedCount / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {locations.map((loc, i) => {
          const pinned = pinnedIds.has(loc.id);
          return (
            <li key={loc.id}>
              <a
                href={`/locations/${loc.id}`}
                className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 hover:border-[var(--accent)] transition-colors group"
              >
                <div className="shrink-0 mt-0.5">
                  {authed && loaded ? (
                    pinned
                      ? <CheckCircle2 size={18} className="text-[var(--accent)]" />
                      : <Circle size={18} className="text-[var(--foreground-muted)]" />
                  ) : (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--foreground-muted)]">
                      {i + 1}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
                    {loc.name}
                  </p>
                  {loc.description && (
                    <p className="text-sm text-[var(--foreground-muted)] mt-0.5 line-clamp-2">
                      {loc.description}
                    </p>
                  )}
                  {loc.difficulty_level && (
                    <p className="text-xs text-[var(--foreground-muted)] mt-1">
                      {difficultyLabel[loc.difficulty_level] ?? `Level ${loc.difficulty_level}`}
                    </p>
                  )}
                </div>
                <MapPin size={14} className="shrink-0 mt-1 text-[var(--foreground-muted)] group-hover:text-[var(--accent)] transition-colors" />
              </a>
            </li>
          );
        })}
      </ol>

      {!authed && loaded && (
        <p className="mt-4 text-sm text-[var(--foreground-muted)] text-center">
          <a href="/auth" className="text-[var(--accent)] hover:underline">Sign in</a> to track your progress.
        </p>
      )}
    </div>
  );
}
