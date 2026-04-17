'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props { next?: string }

export function SignInForm({ next = '/dashboard' }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
    setLoading(false)
  }

  async function handleForgotPassword() {
    if (!email) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    })
    setResetSent(true)
    setLoading(false)
  }

  if (resetSent) {
    return (
      <div className="text-center flex flex-col gap-4">
        <div>
          <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-teal mb-3">
            Reset link sent
          </div>
          <p className="font-sans text-sm text-[var(--text-mid)]">
            Check your email for a password reset link.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setResetSent(false)}
          className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors"
        >
          ← Back to sign in
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-5">
      <div>
        <div className="font-display text-xl text-[var(--text)] mb-1">
          Secure Access
        </div>
        <div className="font-sans text-xs text-[var(--text-dim)]">
          DEQODE EARTH partner portal
        </div>
      </div>

      {error && (
        <div className="font-mono text-[0.65rem] tracking-[0.1em] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5
                     font-sans text-sm text-[var(--text)] placeholder-[var(--text-dim)]
                     focus:outline-none focus:border-teal/60 transition-colors"
          placeholder="you@government.gov"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5
                     font-sans text-sm text-[var(--text)] placeholder-[var(--text-dim)]
                     focus:outline-none focus:border-teal/60 transition-colors"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-teal text-ocean font-mono text-[0.7rem] tracking-[0.15em] uppercase
                   py-3 rounded hover:bg-teal/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <button
        type="button"
        onClick={handleForgotPassword}
        disabled={loading}
        className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)]
                   hover:text-teal transition-colors text-center disabled:opacity-50"
      >
        Forgot password
      </button>
    </form>
  )
}
