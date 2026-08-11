import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Send, Loader2, CornerDownRight } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

interface Discussion {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  profiles: { username: string | null } | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent)]/10 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
      {name[0].toUpperCase()}
    </div>
  );
}

export default function LocationDiscussion({ locationId }: { locationId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<Discussion | null>(null);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) =>
      setUser(s?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from('location_discussions')
      .select('id, content, created_at, parent_id, user_id, profiles(username)')
      .eq('location_id', locationId)
      .order('created_at', { ascending: true });
    setPosts((data as unknown as Discussion[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, [locationId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: err } = await supabase.from('location_discussions').insert({
      location_id: locationId,
      user_id: user.id,
      content: content.trim(),
      parent_id: replyTo?.id ?? null,
    });

    if (err) {
      setError(err.message);
    } else {
      setContent('');
      setReplyTo(null);
      fetchPosts();
    }
    setSubmitting(false);
  }

  // Build threaded structure: top-level + their replies
  const topLevel = posts.filter((p) => !p.parent_id);
  const replies = (parentId: string) => posts.filter((p) => p.parent_id === parentId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-[var(--accent)]" />
        <h2 className="font-semibold text-[var(--foreground)]">
          Discussion
          {posts.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--foreground-muted)]">({posts.length})</span>
          )}
        </h2>
      </div>

      {/* Post form */}
      {user ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          {replyTo && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--foreground-muted)]">
              <CornerDownRight size={12} />
              Replying to <span className="font-medium text-[var(--foreground)]">{replyTo.profiles?.username ?? 'Member'}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="ml-auto hover:text-[var(--foreground)] transition-colors">&times;</button>
            </div>
          )}
          <div className="flex items-start gap-2.5">
            <Avatar name={user.email?.[0] ?? '?'} />
            <div className="flex-1 flex gap-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={2}
                placeholder={replyTo ? `Reply to ${replyTo.profiles?.username ?? 'Member'}…` : 'Leave a comment…'}
                className="flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors resize-none"
              />
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="self-end inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
          {error && (
            <p className="text-xs text-[var(--destructive)] bg-[var(--error-light)] rounded-lg px-3 py-2">{error}</p>
          )}
        </form>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--foreground-muted)]">Sign in to join the discussion.</p>
          <a href="/auth" className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
            Sign In
          </a>
        </div>
      )}

      {/* Thread */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : topLevel.length === 0 ? (
        <div className="py-10 text-center">
          <MessageSquare size={28} className="mx-auto text-[var(--foreground-subtle)] mb-2" />
          <p className="text-sm text-[var(--foreground-muted)]">No comments yet. Be the first!</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {topLevel.map((post) => (
            <div key={post.id} className="py-4 first:pt-0">
              {/* Top-level post */}
              <div className="flex items-start gap-2.5">
                <Avatar name={post.profiles?.username ?? '?'} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {post.profiles?.username ?? 'Member'}
                    </span>
                    <span className="text-xs text-[var(--foreground-subtle)]">{timeAgo(post.created_at)}</span>
                  </div>
                  <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">{post.content}</p>
                  {user && (
                    <button
                      onClick={() => setReplyTo(post)}
                      className="mt-1.5 text-xs text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {replies(post.id).map((reply) => (
                <div key={reply.id} className="mt-3 ml-9 flex items-start gap-2.5">
                  <CornerDownRight size={12} className="mt-1 shrink-0 text-[var(--foreground-subtle)]" />
                  <Avatar name={reply.profiles?.username ?? '?'} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {reply.profiles?.username ?? 'Member'}
                      </span>
                      <span className="text-xs text-[var(--foreground-subtle)]">{timeAgo(reply.created_at)}</span>
                    </div>
                    <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
