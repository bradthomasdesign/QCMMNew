import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Trash2, ShieldCheck, User } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_anonymous: boolean;
  username: string | null;
  full_name: string | null;
  count: number;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    supabase.rpc('admin_list_users', { p_limit: 200, p_offset: 0 })
      .then(({ data }) => { setUsers((data as UserRow[]) ?? []); setLoading(false); });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function deleteUser(user: UserRow) {
    if (!confirm(`Delete ${user.email}? This permanently removes all their data.`)) return;
    setDeleting(user.id);
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: user.id });
    setDeleting(null);
    if (error) {
      showToast(`Error: ${error.message}`);
    } else {
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(`${user.email} deleted`);
    }
  }

  const filtered = users.filter(u =>
    (u.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username ?? '').toLowerCase().includes(search.toLowerCase())
  );

  function fmt(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--foreground)] text-[var(--background)] text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">Users</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">{users.length} registered accounts</p>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or username…"
          className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2 pl-9 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">Loading…</div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">User</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">Joined</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">Last seen</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--foreground-secondary)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-[var(--background-secondary)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center shrink-0">
                        <User size={14} className="text-[var(--accent)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {user.username ?? <span className="text-[var(--foreground-muted)] italic">no username</span>}
                        </p>
                        <p className="text-xs text-[var(--foreground-muted)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">{fmt(user.created_at)}</td>
                  <td className="px-4 py-3 text-[var(--foreground-muted)]">{fmt(user.last_sign_in_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteUser(user)}
                      disabled={deleting === user.id}
                      title="Delete user"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/5 text-red-500 text-xs hover:bg-red-500/15 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={11} />
                      {deleting === user.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-[var(--foreground-muted)]">No users match &ldquo;{search}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
