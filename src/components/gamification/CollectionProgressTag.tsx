import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getCheckedInIds } from '@/components/locations/LocalCheckInButton';

interface Props {
  collectionSlug: string;
  collectionName: string;
  locationSlugs: string[];
}

export default function CollectionProgressTag({ collectionSlug, collectionName, locationSlugs }: Props) {
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCheckedInIds(getCheckedInIds());
    const onCheckin = () => setCheckedInIds(getCheckedInIds());
    window.addEventListener('qcmm-checkin', onCheckin);
    return () => window.removeEventListener('qcmm-checkin', onCheckin);
  }, []);

  const total = locationSlugs.length;
  const checked = locationSlugs.filter((s) => checkedInIds.has(s)).length;
  const done = total > 0 && checked >= total;

  return (
    <a
      href={`/collections/${collectionSlug}`}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] px-3 py-1.5 text-sm text-[var(--foreground-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
    >
      {done && <CheckCircle2 size={13} className="text-[var(--accent)] shrink-0" />}
      <span className="font-medium text-[var(--foreground)]">{collectionName}</span>
      <span className="text-xs">
        {total === 0 ? '0 stops' : `${checked}/${total}`}
      </span>
    </a>
  );
}
