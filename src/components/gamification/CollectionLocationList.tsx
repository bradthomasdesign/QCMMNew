import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, MapPin } from 'lucide-react';
import { getCheckedInIds } from '@/components/locations/LocalCheckInButton';

interface Location {
  slug: string;
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
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCheckedInIds(getCheckedInIds());
    const onCheckin = () => setCheckedInIds(getCheckedInIds());
    window.addEventListener('qcmm-checkin', onCheckin);
    return () => window.removeEventListener('qcmm-checkin', onCheckin);
  }, []);

  const checkedCount = locations.filter((l) => checkedInIds.has(l.slug)).length;
  const total = locations.length;

  return (
    <div>
      {total > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              {checkedCount} of {total} checked in
            </span>
            {checkedCount === total && checkedCount > 0 && (
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
          const pinned = checkedInIds.has(loc.slug);
          return (
            <li key={loc.slug}>
              <a
                href={`/locations/${loc.slug}`}
                className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 hover:border-[var(--accent)] transition-colors group"
              >
                <div className="shrink-0 mt-0.5">
                  {pinned
                    ? <CheckCircle2 size={18} className="text-[var(--accent)]" />
                    : <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[var(--border)] text-xs font-semibold text-[var(--foreground-muted)]">{i + 1}</span>
                  }
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
    </div>
  );
}
