import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

const supabase = createClient(
  (import.meta as any).env.PUBLIC_SUPABASE_URL,
  (import.meta as any).env.PUBLIC_SUPABASE_ANON_KEY,
);

type Mode = 'signin' | 'signup' | 'forgot';

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const params = new URLSearchParams(window.location.search);
        window.location.href = params.get('redirect') ?? '/profile';
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setSuccess('Check your email for a confirmation link to complete sign-up.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset`,
        });
        if (error) throw error;
        setSuccess('Password reset email sent. Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const isSignIn = mode === 'signin';
  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  return (
    <div className="w-full space-y-4">
      {/* Tab switcher */}
      {!isForgot && (
        <div className="flex rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-1">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); reset(); }}
              className={[
                'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                mode === m
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-[var(--theme-shadow-sm)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
              ].join(' ')}
            >
              {m === 'signin' ? <LogIn size={14} /> : <UserPlus size={14} />}
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {isForgot && (
          <p className="text-sm text-[var(--foreground-muted)]">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)]">
            Email
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-9 pr-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
            />
          </div>
        </div>

        {/* Password */}
        {!isForgot && (
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)]">
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                placeholder={isSignUp ? 'Min. 8 characters' : '••••••••'}
                minLength={isSignUp ? 8 : undefined}
                className="w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] py-2.5 pl-9 pr-10 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:border-[var(--input-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Forgot password link */}
        {isSignIn && (
          <div className="text-right">
            <button
              type="button"
              onClick={() => { setMode('forgot'); reset(); }}
              className="text-xs text-[var(--foreground-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Error / Success */}
        {error && (
          <p className="rounded-xl bg-[var(--error-light)] px-4 py-2.5 text-sm text-[var(--destructive)]">
            {error}
          </p>
        )}
        {success && (
          <div className="flex items-start gap-2.5 rounded-xl bg-[var(--success-light)] px-4 py-2.5 text-sm text-[var(--foreground)]">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-600" />
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !!success}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : isForgot ? (
            'Send Reset Link'
          ) : isSignIn ? (
            <>
              <LogIn size={15} />
              Sign In
            </>
          ) : (
            <>
              <UserPlus size={15} />
              Create Account
            </>
          )}
        </button>
      </form>

      {/* Back link from forgot password */}
      {isForgot && (
        <button
          type="button"
          onClick={() => { setMode('signin'); reset(); }}
          className="w-full text-center text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ← Back to sign in
        </button>
      )}
    </div>
  );
}
