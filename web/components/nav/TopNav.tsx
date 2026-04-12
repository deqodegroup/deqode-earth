import Link from "next/link";

export function TopNav() {
  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-12 py-4
                    bg-ocean/95 backdrop-blur border-b border-[var(--border)]">
      <Link href="/" className="flex items-center gap-4 group">
        {/* Logo mark: orbital ring */}
        <div className="w-9 h-9 rounded bg-teal flex items-center justify-center flex-shrink-0
                        group-hover:bg-teal/90 transition-colors">
          <div className="w-5 h-5 rounded-full border-2 border-ocean relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-ocean" />
            </div>
          </div>
        </div>
        <div>
          <div className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
            DEQODE GROUP
          </div>
          <div className="font-display text-xl leading-none text-[var(--text)]">
            EARTH<span className="text-teal">.</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          <span className="font-mono text-[0.65rem] tracking-[0.14em] uppercase text-teal">
            Sentinel Active
          </span>
        </div>
        <Link
          href="#"
          className="font-mono text-[0.65rem] tracking-[0.14em] uppercase
                     px-4 py-2 rounded border border-[var(--border)]
                     text-[var(--text-mid)] hover:border-teal hover:text-teal
                     transition-colors"
        >
          Sign In
        </Link>
      </div>
    </nav>
  );
}
