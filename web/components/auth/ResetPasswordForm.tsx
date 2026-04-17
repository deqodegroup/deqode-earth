'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    setError(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError('Failed to set password. Please try again or request a new link.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handleReset} className="flex flex-col gap-5">
      <div>
        <div className="font-display text-xl text-[var(--text)] mb-1">Reset password</div>
        <div className="font-sans text-xs text-[var(--text-dim)]">Enter your new password below.</div>
      </div>

      {error && (
        <div className="font-mono text-[0.65rem] tracking-[0.1em] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">New password</label>
        <input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5 font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Confirm password</label>
        <input id="confirm" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="bg-ocean border border-[var(--border)] rounded px-3 py-2.5 font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors" />
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-teal text-ocean font-mono text-[0.7rem] tracking-[0.15em] uppercase py-3 rounded hover:bg-teal/90 transition-colors disabled:opacity-50">
        {loading ? 'Saving…' : 'Set New Password'}
      </button>
    </form>
  )
}
