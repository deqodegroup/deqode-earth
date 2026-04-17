'use client'
import { useState } from 'react'
import type { Profile } from '@/lib/supabase/types'
import { InviteModal } from './InviteModal'

interface Props {
  initialUsers: Profile[]
}

export function UserTable({ initialUsers }: Props) {
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refreshUsers() {
    const res = await fetch('/api/admin/users')
    const data = await res.json()
    if (data.users) setUsers(data.users)
  }

  async function resendInvite(email: string) {
    setError(null)
    const res = await fetch('/api/admin/invite/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to resend invite.')
    }
  }

  async function toggleStatus(user: Profile) {
    setLoadingId(user.id)
    setError(null)
    const newStatus = user.invite_status === 'deactivated' ? 'active' : 'deactivated'
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_status: newStatus }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to update status.')
    } else {
      await refreshUsers()
    }
    setLoadingId(null)
  }

  async function updateRole(userId: string, role: string) {
    setLoadingId(userId)
    setError(null)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to update role.')
    } else {
      await refreshUsers()
    }
    setLoadingId(null)
  }

  const statusColor: Record<string, string> = {
    active: 'text-teal border-teal/30 bg-teal/5',
    pending: 'text-gold border-gold/30 bg-gold/5',
    deactivated: 'text-coral border-coral/30 bg-coral/5',
  }

  const selectClass = "bg-ocean border border-[var(--border)] rounded px-2 py-1 font-mono text-[0.6rem] tracking-[0.08em] text-[var(--text-mid)] focus:outline-none focus:border-teal/60 transition-colors"

  return (
    <>
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={refreshUsers}
        />
      )}

      {error && (
        <div className="font-mono text-[0.65rem] text-coral border border-coral/30 bg-coral/5 rounded px-3 py-2 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-display text-2xl text-[var(--text)]">User Management</div>
          <div className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)] mt-1">
            {users.length} accounts · DEQODE admin only
          </div>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="font-mono text-[0.65rem] tracking-[0.12em] uppercase px-4 py-2.5 rounded
                     bg-teal text-ocean hover:bg-teal/90 transition-colors"
        >
          + Invite User
        </button>
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-surface">
              {['Email', 'Org', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-mono text-[0.6rem] tracking-[0.15em] uppercase text-[var(--text-dim)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-[var(--border)] last:border-0 hover:bg-surface/50 transition-colors">
                <td className="px-4 py-3 font-sans text-sm text-[var(--text)]">{user.email}</td>
                <td className="px-4 py-3 font-mono text-[0.65rem] tracking-[0.08em] text-[var(--text-mid)]">{user.org_slug}</td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={e => updateRole(user.id, e.target.value)}
                    disabled={loadingId === user.id}
                    className={selectClass}
                  >
                    {['viewer', 'analyst', 'admin', 'deqode_admin'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-[0.6rem] tracking-[0.1em] uppercase border rounded-full px-2 py-0.5 ${statusColor[user.invite_status] ?? ''}`}>
                    {user.invite_status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[0.6rem] text-[var(--text-dim)]">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.invite_status === 'pending' && (
                      <button
                        onClick={() => resendInvite(user.email)}
                        className="font-mono text-[0.6rem] tracking-[0.08em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors"
                      >
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => toggleStatus(user)}
                      disabled={loadingId === user.id}
                      className={`font-mono text-[0.6rem] tracking-[0.08em] uppercase transition-colors disabled:opacity-40
                        ${user.invite_status === 'deactivated'
                          ? 'text-teal hover:text-teal/80'
                          : 'text-coral hover:text-coral/80'}`}
                    >
                      {loadingId === user.id ? '…' : user.invite_status === 'deactivated' ? 'Reactivate' : 'Deactivate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
