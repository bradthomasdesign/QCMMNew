import { useEffect, useState } from 'react';
import { Users, Check } from 'lucide-react';
import { getMetSlugs, MET_CHARS_KEY } from '@/components/characters/LocalMetButton';

export interface CharacterData {
  slug: string;
  name: string;
  bio: string;
  group?: string;
  avatarSrc?: string;
  avatarAlt?: string;
}

const GROUP_LABELS: Record<string, string> = {
  'professors': 'Professors',
  'students': 'Students',
  'ozland': 'Ozland',
  'favorite-supporting': 'Favorite Supporting',
  'supporting': 'Supporting',
  'beauxbatons': 'Beauxbatons',
  'baddies': 'Baddies',
  'founders': 'Founders',
};

interface Props {
  characters: CharacterData[];
}

export default function CharacterRoster({ characters }: Props) {
  const [discoveredSlugs, setDiscoveredSlugs] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [activeGroup, setActiveGroup] = useState('all');

  const groupCounts = Object.fromEntries(
    Object.keys(GROUP_LABELS).map((g) => [g, characters.filter((c) => c.group === g).length])
  );
  const groups = [
    'all',
    ...Object.keys(GROUP_LABELS)
      .filter((g) => groupCounts[g] > 0)
      .sort((a, b) => groupCounts[b] - groupCounts[a]),
  ];

  const visible = activeGroup === 'all'
    ? characters
    : characters.filter((c) => c.group === activeGroup);

  useEffect(() => {
    setDiscoveredSlugs(getMetSlugs());
    setLoaded(true);

    const onMet = () => setDiscoveredSlugs(getMetSlugs());
    window.addEventListener('qcmm-met-character', onMet);
    return () => window.removeEventListener('qcmm-met-character', onMet);
  }, []);

  if (characters.length === 0) {
    return (
      <div className="py-16 text-center text-[var(--foreground-muted)]">
        <Users size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm">No characters have been added yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Group filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              activeGroup === g
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--background-secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]',
            ].join(' ')}
          >
            {g === 'all' ? `All (${characters.length})` : `${GROUP_LABELS[g]} (${groupCounts[g]})`}
          </button>
        ))}
      </div>

      {loaded && discoveredSlugs.size > 0 && (
        <p className="mb-6 text-sm text-[var(--foreground-muted)]">
          You've met <span className="font-semibold text-[var(--foreground)]">{discoveredSlugs.size}</span> of{' '}
          <span className="font-semibold text-[var(--foreground)]">{characters.length}</span> characters.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((char) => {
          const discovered = discoveredSlugs.has(char.slug);
          return (
            <a
              key={char.slug}
              href={`/characters/${char.slug}`}
              className="relative flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 hover:border-[var(--accent)] transition-colors group"
            >
              {loaded && discovered && (
                <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Check size={10} />
                  Met!
                </span>
              )}

              <div className="flex items-center gap-3">
                {char.avatarSrc ? (
                  <img
                    src={char.avatarSrc}
                    alt={char.avatarAlt ?? char.name}
                    width={48}
                    height={48}
                    className="rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--background-secondary)] flex items-center justify-center shrink-0">
                    <Users size={20} className="text-[var(--foreground-muted)]" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                    {char.name}
                  </h3>
                  {char.group && (
                    <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">
                      {GROUP_LABELS[char.group] ?? char.group}
                    </p>
                  )}
                </div>
              </div>

              {char.bio && (
                <p className="text-sm text-[var(--foreground-muted)] leading-relaxed line-clamp-3">
                  {char.bio}
                </p>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
