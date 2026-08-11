import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Props {
  locationId: string;
}

export default function CheckInButton({ locationId }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user ?? null;
      setAuthed(!!user);
      if (user) {
        const { data: existing } = await supabase
          .from('pins')
          .select('id')
          .eq('user_id', user.id)
          .eq('location_id', locationId)
          .maybeSingle();
        setPinned(!!existing);
      }
    });
  }, [locationId]);

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-center">
        <p className="text-sm text-[var(--foreground-muted)] mb-3">
          Sign in to collect this pin and earn XP.
        </p>
        <a
          href={`/auth?redirect=${encodeURIComponent(window.location.pathname)}`}
          className="block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          Sign In to Check In
        </a>
      </div>
    );
  }

  if (pinned) {
    return (
      <div className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-4 text-center">
        <p className="text-sm font-semibold text-[var(--accent)]">✓ Pin collected!</p>
        <p className="text-xs text-[var(--foreground-muted)] mt-1">You've already checked in here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-center">
      <p className="text-sm text-[var(--foreground-muted)] mb-1">
        You're signed in and ready to go.
      </p>
      <p className="text-xs text-[var(--foreground-subtle)]">
        Scan the QR code at this location to earn your pin and XP.
      </p>
    </div>
  );
}
