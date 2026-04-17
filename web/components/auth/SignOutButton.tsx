'use client'

export function SignOutButton() {
  return (
    <form action="/api/auth/signout" method="POST">
      <button
        type="submit"
        className="font-mono text-[0.6rem] tracking-[0.12em] uppercase
                   text-[var(--text-dim)] hover:text-coral transition-colors"
      >
        Sign Out
      </button>
    </form>
  )
}
