'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === 'signup';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Enter email and password.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        router.push('/notes');
        router.refresh();
      } else {
        setSuccess('Account created! Check your email to confirm, then log in.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      router.push('/notes');
      router.refresh();
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg2)] p-7">
        <h1 className="text-xl font-bold">{isSignUp ? 'Sign Up' : 'Log In'}</h1>
        <p className="mt-1 text-sm text-[var(--color-text2)]">
          Use the same account in the desktop app to sync your notes.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-[var(--color-text2)]">Email</label>
            <input
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[var(--color-text2)]">Password</label>
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          <button type="submit" className="btn-primary mt-2" disabled={loading}>
            {loading ? '...' : isSignUp ? 'Create Account' : 'Log In'}
          </button>

          {error && <div className="text-sm text-[var(--color-red)]">{error}</div>}
          {success && <div className="text-sm text-[var(--color-green)]">{success}</div>}
        </form>

        <div className="mt-4 text-center text-sm text-[var(--color-text2)]">
          {isSignUp ? (
            <>Already have an account? <a className="text-[var(--color-accent)] hover:underline" href="/login">Log in</a></>
          ) : (
            <>Don&apos;t have an account? <a className="text-[var(--color-accent)] hover:underline" href="/signup">Sign up</a></>
          )}
        </div>
      </div>
    </div>
  );
}
