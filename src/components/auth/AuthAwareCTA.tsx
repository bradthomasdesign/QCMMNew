import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Props {
  /** href and label shown to signed-out users */
  signInHref?: string;
  signInLabel?: string;
  /** href and label shown to signed-in users (omit to hide the CTA entirely when authed) */
  authedHref?: string;
  authedLabel?: string;
  className?: string;
}

export default function AuthAwareCTA({
  signInHref = '/auth',
  signInLabel = 'Sign In',
  authedHref,
  authedLabel,
  className = 'inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors',
}: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthed(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Hidden while loading — no flash of sign-in prompt
  if (authed === null) return null;

  // Already signed in — show alternate CTA or nothing
  if (authed) {
    if (!authedHref) return null;
    return <a href={authedHref} className={className}>{authedLabel}</a>;
  }

  return <a href={signInHref} className={className}>{signInLabel}</a>;
}
