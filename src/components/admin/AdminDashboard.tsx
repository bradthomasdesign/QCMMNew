import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MapPin, Users, MessageSquare, Flag } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({ locations: 0, users: 0, posts: 0, flags: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('locations').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('message_posts').select('id', { count: 'exact', head: true }),
      supabase.from('flagged_content').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([loc, usr, posts, flags]) => {
      setStats({
        locations: loc.count ?? 0,
        users: usr.count ?? 0,
        posts: posts.count ?? 0,
        flags: flags.count ?? 0,
      });
    });
  }, []);

  const cards = [
    { label: 'Locations', value: stats.locations, icon: MapPin, href: '/admin/locations', color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10' },
    { label: 'Users', value: stats.users, icon: Users, href: '/admin/users', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Community Posts', value: stats.posts, icon: MessageSquare, href: '/admin/moderation', color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Pending Flags', value: stats.flags, icon: Flag, href: '/admin/moderation', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">QCMM site overview</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map(({ label, value, icon: Icon, href, color, bg }) => (
          <a
            key={label}
            href={href}
            className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-5 hover:border-[var(--border-strong)] transition-colors group"
          >
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-3xl font-bold text-[var(--foreground)]">{value}</p>
            <p className="text-sm text-[var(--foreground-muted)] mt-0.5">{label}</p>
          </a>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-5">
        <h2 className="font-semibold text-[var(--foreground)] mb-3">Quick links</h2>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Manage locations', href: '/admin/locations' },
            { label: 'View all users', href: '/admin/users' },
            { label: 'Review flagged content', href: '/admin/moderation' },
            { label: 'Go to community feed', href: '/community' },
            { label: 'View members leaderboard', href: '/members' },
          ].map(({ label, href }) => (
            <a key={href} href={href} className="text-sm text-[var(--accent)] hover:underline">
              {label} →
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
