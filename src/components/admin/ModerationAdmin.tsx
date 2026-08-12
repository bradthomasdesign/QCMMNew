import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string | null } | null;
  category: { name: string } | null;
}

interface Flag {
  id: string;
  content_id: string;
  content_type: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reporter: { username: string | null } | null;
  contentSnippet?: string;
}

export default function ModerationAdmin() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [tab, setTab] = useState<'posts' | 'flags'>('posts');
  const [toast, setToast] = useState('');

  useEffect(() => {
    supabase
      .from('message_posts')
      .select('id,content,created_at,user_id,profiles(username),category:message_categories(name)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setPosts((data as any) ?? []); setLoadingPosts(false); });

    loadFlags();
  }, []);

  async function loadFlags() {
    setLoadingFlags(true);
    const { data } = await supabase
      .from('flagged_content')
      .select('id,content_id,content_type,reason,description,status,created_at,reporter:profiles!flagged_content_reporter_id_fkey(username)')
      .order('created_at', { ascending: false });

    const rawFlags: Flag[] = (data as any) ?? [];

    // Batch-fetch content snippets for post and comment flags
    const postIds = rawFlags.filter(f => f.content_type === 'community_post').map(f => f.content_id);
    const commentIds = rawFlags.filter(f => f.content_type === 'community_comment').map(f => f.content_id);

    const contentMap: Record<string, string> = {};

    await Promise.all([
      postIds.length > 0
        ? supabase.from('message_posts').select('id,content').in('id', postIds).then(({ data: rows }) => {
            (rows ?? []).forEach((r: any) => { contentMap[r.id] = r.content; });
          })
        : Promise.resolve(),
      commentIds.length > 0
        ? supabase.from('post_comments').select('id,content').in('id', commentIds).then(({ data: rows }) => {
            (rows ?? []).forEach((r: any) => { contentMap[r.id] = r.content; });
          })
        : Promise.resolve(),
    ]);

    setFlags(rawFlags.map(f => ({ ...f, contentSnippet: contentMap[f.content_id] })));
    setLoadingFlags(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }

  async function deletePost(post: Post) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    const { error } = await supabase.from('message_posts').delete().eq('id', post.id);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== post.id));
      showToast('Post deleted');
    }
  }

  async function resolveFlag(flag: Flag) {
    const { error } = await supabase
      .from('flagged_content')
      .update({ status: 'resolved', reviewed_at: new Date().toISOString() })
      .eq('id', flag.id);
    if (!error) {
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, status: 'resolved' } : f));
      showToast('Flag resolved');
    }
  }

  async function deleteAndResolve(flag: Flag) {
    const label = flag.content_type === 'community_post' ? 'post' : 'reply';
    if (!confirm(`Delete this ${label} and resolve the flag? This cannot be undone.`)) return;

    const table = flag.content_type === 'community_post' ? 'message_posts' : 'post_comments';
    const { error } = await supabase.from(table).delete().eq('id', flag.content_id);
    if (!error) {
      await supabase
        .from('flagged_content')
        .update({ status: 'resolved', reviewed_at: new Date().toISOString() })
        .eq('id', flag.id);
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, status: 'resolved', contentSnippet: undefined } : f));
      showToast(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted and flag resolved`);
    }
  }

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const pendingFlags = flags.filter(f => f.status === 'pending').length;

  return (
    <div className="flex flex-col gap-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--foreground)] text-[var(--background)] text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">Moderation</h1>
        <p className="text-sm text-[var(--foreground-muted)] mt-1">Review community posts and flagged content</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {([['posts', 'Community Posts'], ['flags', 'Flagged Content']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === key
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
            ].join(' ')}
          >
            {label}
            {key === 'flags' && pendingFlags > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {pendingFlags}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        loadingPosts ? (
          <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">Loading…</div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">No community posts yet.</div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background-secondary)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">Post</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">Author</th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--foreground-secondary)]">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-[var(--foreground-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {posts.map(post => (
                  <tr key={post.id} className="hover:bg-[var(--background-secondary)] transition-colors">
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-[var(--foreground)] line-clamp-2">{post.content}</p>
                      {post.category && (
                        <span className="text-xs text-[var(--foreground-muted)]">{post.category.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {post.profiles?.username ?? 'unknown'}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)] whitespace-nowrap">{fmt(post.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deletePost(post)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/5 text-red-500 text-xs hover:bg-red-500/15 transition-colors"
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'flags' && (
        loadingFlags ? (
          <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">Loading…</div>
        ) : flags.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--foreground-muted)]">No flagged content.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {flags.map(flag => (
              <div key={flag.id} className={[
                'rounded-xl border p-4 flex flex-col gap-3',
                flag.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--border)] bg-[var(--background-secondary)]',
              ].join(' ')}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {flag.status === 'pending'
                      ? <AlertTriangle size={16} className="text-amber-500" />
                      : <CheckCircle size={16} className="text-green-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-[var(--foreground)] uppercase tracking-wide">
                        {flag.content_type === 'community_post' ? 'Post' : flag.content_type === 'community_comment' ? 'Reply' : flag.content_type}
                      </span>
                      <span className="text-xs text-[var(--foreground-muted)]">· {flag.reason.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-[var(--foreground-subtle)]">· reported by {flag.reporter?.username ?? 'unknown'}</span>
                      <span className="text-xs text-[var(--foreground-subtle)]">· {fmt(flag.created_at)}</span>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-[var(--foreground-muted)] mt-1">{flag.description}</p>
                    )}
                    {flag.contentSnippet ? (
                      <p className="mt-2 text-sm text-[var(--foreground)] bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 line-clamp-3">
                        {flag.contentSnippet}
                      </p>
                    ) : flag.status !== 'resolved' ? (
                      <p className="mt-2 text-xs text-[var(--foreground-subtle)] italic">Content no longer exists.</p>
                    ) : null}
                  </div>
                </div>

                {flag.status === 'pending' && (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => resolveFlag(flag)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 text-green-600 text-xs hover:bg-green-500/20 transition-colors"
                    >
                      <CheckCircle size={11} /> Resolve
                    </button>
                    {flag.contentSnippet && (flag.content_type === 'community_post' || flag.content_type === 'community_comment') && (
                      <button
                        onClick={() => deleteAndResolve(flag)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 text-xs hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 size={11} /> Delete & Resolve
                      </button>
                    )}
                  </div>
                )}
                {flag.status !== 'pending' && (
                  <p className="text-right text-xs text-[var(--foreground-subtle)]">Resolved</p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
