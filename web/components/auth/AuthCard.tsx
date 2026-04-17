import type { ReactNode } from 'react'

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ocean px-4
                    relative overflow-hidden">
      {/* Atmospheric glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 40%, rgba(76,185,192,0.06) 0%, transparent 70%)' }} />
      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
           style={{
             backgroundImage: 'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
             backgroundSize: '48px 48px',
           }} />
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded bg-teal flex items-center justify-center">
            <div className="w-4 h-4 rounded-full border-2 border-ocean" />
          </div>
          <div>
            <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
              DEQODE GROUP
            </div>
            <div className="font-display text-lg leading-none text-[var(--text)]">
              EARTH<span className="text-teal">.</span>
            </div>
          </div>
        </div>
        {/* Card */}
        <div className="rounded-lg border border-[var(--border)] bg-surface p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
