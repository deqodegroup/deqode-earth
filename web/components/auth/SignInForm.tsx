'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { sanitizeRedirectPath } from '@/lib/auth/redirects'

interface Props {
  next?: string
}

export function SignInForm({ next = '/dashboard' }: Props) {
  const redirectTo = sanitizeRedirectPath(next)
  const [mode, setMode] = useState<'signin' | 'forgot' | 'sent'>('signin')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  async function handleForgotPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!resetEmail) return

    setResetLoading(true)
    const supabase = createSupabaseBrowserClient()
    const resetPath = `/auth/reset?next=${encodeURIComponent(redirectTo)}`
    const callbackParams = new URLSearchParams({
      next: resetPath,
      type: 'recovery',
    })
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?${callbackParams.toString()}`,
    })

    if (error) {
      setResetError('Reset email could not be sent. Please try again.')
      setResetLoading(false)
      return
    }

    setMode('sent')
    setResetLoading(false)
  }

  if (mode === 'sent') {
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
          onClick={() => setMode('signin')}
          className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  if (mode === 'forgot') {
    return (
      <form onSubmit={handleForgotPassword} className="flex flex-col gap-5">
        <div>
          <div className="font-display text-xl text-[var(--text)] mb-1">Reset password</div>
          <div className="font-sans text-xs text-[var(--text-dim)]">
            Enter your email to receive a reset link.
          </div>
        </div>

        {resetError && (
          <div className="font-mono text-[0.65rem] tracking-[0.1em] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2">
            {resetError}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="reset-email" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            value={resetEmail}
            onChange={e => setResetEmail(e.target.value)}
            autoComplete="email"
            className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5 font-sans text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-teal/60 transition-colors"
            placeholder="you@government.gov"
          />
        </div>

        <button
          type="submit"
          disabled={resetLoading}
          className="w-full bg-teal text-ocean font-mono text-[0.7rem] tracking-[0.15em] uppercase py-3 rounded hover:bg-teal/90 transition-colors disabled:opacity-50"
        >
          {resetLoading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <button
          type="button"
          onClick={() => setMode('signin')}
          disabled={resetLoading}
          className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors text-center disabled:opacity-50"
        >
          Back to sign in
        </button>
      </form>
    )
  }

  return (
    <form action="/api/auth/login" method="POST" className="flex flex-col gap-5">
      <input type="hidden" name="next" value={redirectTo} />
      <div>
        <div className="font-display text-xl text-[var(--text)] mb-1">
          Secure Access
        </div>
        <div className="font-sans text-xs text-[var(--text-dim)]">
          DEQODE EARTH partner portal
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5 font-sans text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-teal/60 transition-colors"
          placeholder="you@government.gov"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5 font-sans text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-teal/60 transition-colors"
          placeholder="Password"
        />
      </div>

      <button
        type="submit"
        className="w-full bg-teal text-ocean font-mono text-[0.7rem] tracking-[0.15em] uppercase py-3 rounded hover:bg-teal/90 transition-colors disabled:opacity-50"
      >
        Sign In
      </button>

      <button
        type="button"
        onClick={() => {
          setResetError(null)
          setMode('forgot')
        }}
        className="font-mono text-[0.6rem] tracking-[0.1em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors text-center disabled:opacity-50"
      >
        Forgot password
      </button>
    </form>
  )
}
