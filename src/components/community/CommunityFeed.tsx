import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MessageSquare, Plus, Heart, Loader2, Send, X, ChevronDown } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

const QCMM_EXPERIENCE_ID = '25ed3174-a907-44b2-9a3c-e85136f3a47d';

const CATEGORIES = [
  { id: 'all', name: 'All Posts' },
  { id: '0082d06e-717f-407e-af44-d77aa9c5ea1e', name: 'General Discussion' },
  { id: '05da9043-a20f-4ee9-80bd-f801841c8173', name: 'Questions' },
  { id: '1370ed9e-8fe9-4014-93f5-76d682f60658', name: 'Festival Tips' },
  { id: '0af9e6ef-23c1-4ee8-ad27-4511099db5a9', name: 'Festival Feedback' },
];

interface Post {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  category_id: string | null;
  user_id: string;
  profiles: { username: string | null; avatar_url: string | null } | null;
  post_likes: { id: string }[];
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

export default function CommunityFeed() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[1].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user ?? null)
    );
    return () => subscription.unsubscribe();
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('message_posts')
      .select('id, title, content, created_at, category_id, user_id, profiles(username, avatar_url), post_likes(id)')
      .eq('experience_id', QCMM_EXPERIENCE_ID)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activeCategory !== 'all') {
      query = query.eq('category_id', activeCategory);
    }

    const { data, error: err } = await query;
    if (!err) setPosts((data as unknown as Post[]) ?? []);
    setLoading(false);
  }, [activeCategory]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function submitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setSubmitting(true);
    setError(null);

    const { error: err } = await supabase.from('message_posts').insert({
      user_id: user.id,
      experience_id: QCMM_EXPERIENCE_ID,
      category_id: categoryId,
      title: title.trim() || null,
      content: content.trim(),
    });

    if (err) {
      setError(err.message);
    } else {
      setTitle('');
      setContent('');
      setShowForm(false);
      fetchPosts();
    }
    setSubmitting(false);
  }

  async function toggleLike(postId: string) {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    const liked = post?.post_likes.some((l: any) => l.user_id === user.id);

    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
    fetchPosts();
  }

  const categoryName = (id: string | null) =>
    CATEGORIES.find((c) => c.id === id)?.name ?? 'General Discussion';

  return (
    <div className="flex flex-col gap-6">
      {/* Category tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              activeCategory === cat.id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--background-secondary)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border)]',
            ].join(' ')}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Auth CTA or New Post button */}
      {user ? (
        <div>
          {showForm ? (
            <form onSubmit={submitPost} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[var(--foreground)]">New Post</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--input-focus)] focus:outline-none pr-8"
                  >
                    {CATEGORIES.slice(1).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
                </div>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
                />

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={4}
                  placeholder="What's on your mind?"
                  className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors resize-none"
                />
              </div>

              {error && (
                <p className="text-xs text-[var(--destructive)] bg-[var(--error-light)] rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 transition-colors"
                >
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  Post
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-muted)] hover:border-[var(--accent)]/50 hover:text-[var(--foreground)] transition-all w-full"
            >
              <Plus size={14} />
              Share something with the community…
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--foreground-muted)]">Sign in to post and interact with the community.</p>
          <a href="/auth" className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)] transition-colors">
            Sign In
          </a>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-[var(--accent)]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <MessageSquare size={32} className="mx-auto text-[var(--foreground-subtle)] mb-3" />
          <p className="text-[var(--foreground-muted)] text-sm">No posts yet in this category.</p>
          {user && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-[var(--accent)] hover:underline">
              Be the first to post
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border)]">
          {posts.map((post) => {
            const likes = post.post_likes?.length ?? 0;
            const likedByMe = user && post.post_likes?.some((l: any) => l.user_id === user.id);

            return (
              <article key={post.id} className="py-4 first:pt-0">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-[var(--accent)]/30 to-[var(--accent)]/10 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                    {(post.profiles?.username ?? '?')[0].toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-[var(--foreground)]">
                        {post.profiles?.username ?? 'Member'}
                      </span>
                      <span className="text-xs text-[var(--foreground-subtle)]">{timeAgo(post.created_at)}</span>
                      {post.category_id && (
                        <span className="rounded-full bg-[var(--background-secondary)] border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--foreground-muted)]">
                          {categoryName(post.category_id)}
                        </span>
                      )}
                    </div>

                    {post.title && (
                      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">{post.title}</h3>
                    )}
                    <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">{post.content}</p>

                    <div className="mt-2">
                      <button
                        onClick={() => toggleLike(post.id)}
                        disabled={!user}
                        className={[
                          'inline-flex items-center gap-1.5 text-xs transition-colors rounded-lg px-2 py-1 -ml-2',
                          likedByMe
                            ? 'text-[var(--accent)]'
                            : 'text-[var(--foreground-muted)] hover:text-[var(--accent)]',
                        ].join(' ')}
                      >
                        <Heart size={12} className={likedByMe ? 'fill-current' : ''} />
                        {likes > 0 && <span>{likes}</span>}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
