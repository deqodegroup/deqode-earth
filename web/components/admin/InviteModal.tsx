'use client'
import { useState } from 'react'
import type { Role } from '@/lib/supabase/types'
import { LOCATIONS_LIST } from '@/lib/locations'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

const ROLES: Role[] = ['viewer', 'analyst', 'admin']
const ORG_SLUGS = ['deqode', ...LOCATIONS_LIST.map(l => l.slug)]

export function InviteModal({ onClose, onSuccess }: Props) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('viewer')
  const [org_slug, setOrgSlug] = useState('niue')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, org_slug }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    onSuccess()
    onClose()
  }

  const selectClass = "bg-ocean border border-[var(--border)] rounded px-3 py-2 font-sans text-sm text-[var(--text)] focus:outline-none focus:border-teal/60 transition-colors w-full"
  const inputClass = selectClass

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean/80 backdrop-blur-sm px-4">
      <div className="bg-surface border border-[var(--border)] rounded-lg p-8 w-full max-w-sm">
        <div className="font-display text-xl text-[var(--text)] mb-6">Invite User</div>

        {error && (
          <div className="font-mono text-[0.65rem] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-email" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Email</label>
            <input id="invite-email" type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className={inputClass} placeholder="minister@gov.nz" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Role</label>
            <select id="invite-role" value={role} onChange={e => setRole(e.target.value as Role)} className={selectClass}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-org" className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">Organisation</label>
            <select id="invite-org" value={org_slug} onChange={e => setOrgSlug(e.target.value)} className={selectClass}>
              {ORG_SLUGS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose}
              className="flex-1 font-mono text-[0.65rem] tracking-[0.1em] uppercase py-2.5 rounded border border-[var(--border)] text-[var(--text-mid)] hover:border-teal hover:text-teal transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 font-mono text-[0.65rem] tracking-[0.1em] uppercase py-2.5 rounded bg-teal text-ocean hover:bg-teal/90 transition-colors disabled:opacity-50">
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
