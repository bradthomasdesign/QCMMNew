import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LayoutDashboard, MapPin, Users, Shield, LogOut } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import LocationsAdmin from './LocationsAdmin';
import UsersAdmin from './UsersAdmin';
import ModerationAdmin from './ModerationAdmin';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

const NAV = [
  { href: '/admin', label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/locations', label: 'Locations', key: 'locations', icon: MapPin },
  { href: '/admin/users', label: 'Users', key: 'users', icon: Users },
  { href: '/admin/moderation', label: 'Moderation', key: 'moderation', icon: Shield },
] as const;

type Page = typeof NAV[number]['key'];

interface Props {
  page: Page;
}

const PAGES: Record<Page, React.ComponentType> = {
  dashboard: AdminDashboard,
  locations: LocationsAdmin,
  users: UsersAdmin,
  moderation: ModerationAdmin,
};

export default function AdminApp({ page }: Props) {
  const [state, setState] = useState<'loading' | 'authed' | 'denied'>('loading');
  const Content = PAGES[page];

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = `/auth?next=/admin/${page === 'dashboard' ? '' : page}`; return; }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      setState(data ? 'authed' : 'denied');
    }
    check();
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-[var(--foreground)]">Access denied</p>
          <p className="text-sm text-[var(--foreground-muted)] mt-1">Admin privileges required.</p>
          <a href="/" className="mt-4 inline-block text-sm text-[var(--accent)] hover:underline">← Back to site</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--border)]">
          <a href="/" className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">← qcmm.app</a>
          <p className="font-display font-bold text-[var(--foreground)] mt-1 text-lg tracking-tight">Admin</p>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ href, label, key, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className={[
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                page === key
                  ? 'bg-[var(--accent)]/10 text-[var(--accent)] font-medium'
                  : 'text-[var(--foreground-secondary)] hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]',
              ].join(' ')}
            >
              <Icon size={15} />
              {label}
            </a>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[var(--border)]">
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] transition-colors w-full"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        <Content />
      </main>
    </div>
  );
}
