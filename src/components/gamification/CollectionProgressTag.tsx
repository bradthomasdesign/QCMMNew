import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle2 } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Props {
  collectionSlug: string;
  collectionName: string;
}

export default function CollectionProgressTag({ collectionSlug, collectionName }: Props) {
  const [total, setTotal] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id ?? null;

      const { data: locs } = await supabase
        .from('locations')
        .select('id')
        .contains('collection_slugs', [collectionSlug])
        .eq('is_active', true);

      const locationIds = (locs ?? []).map((l: any) => l.id);
      setTotal(locationIds.length);

      if (!userId || locationIds.length === 0) return;

      const { data: pins } = await supabase
        .from('pins')
        .select('location_id')
        .eq('user_id', userId)
        .in('location_id', locationIds);

      setChecked((pins ?? []).length);
    }
    load();
  }, [collectionSlug]);

  if (total === null) return null;

  const done = checked !== null && checked >= total;

  return (
    <a
      href={`/collections/${collectionSlug}`}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background-secondary)] px-3 py-1.5 text-sm text-[var(--foreground-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
    >
      {done && <CheckCircle2 size={13} className="text-[var(--accent)] shrink-0" />}
      <span className="font-medium text-[var(--foreground)]">{collectionName}</span>
      {checked !== null && (
        <span className="text-xs">
          {checked}/{total}
        </span>
      )}
      {checked === null && (
        <span className="text-xs">{total} stops</span>
      )}
    </a>
  );
}
