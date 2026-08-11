import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, LogIn } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

export default function AuthHeaderButton() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session?.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthed(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authed === null) return null;

  if (authed) {
    return (
      <a
        href="/profile"
        aria-label="Your profile"
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] transition-colors"
      >
        <User size={18} />
      </a>
    );
  }

  return (
    <a
      href="/auth"
      aria-label="Sign in"
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--accent)]/50 hover:text-[var(--accent)] transition-colors"
    >
      <LogIn size={14} />
      Sign in
    </a>
  );
}
