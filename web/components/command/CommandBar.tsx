import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SatelliteStatus } from "@/components/command/SatelliteStatus";

export async function CommandBar() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between
                 px-6 bg-ocean/95 backdrop-blur-sm border-b border-[var(--border)]"
      style={{ height: "var(--bar-height)" }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
        <div
          className="w-7 h-7 rounded bg-teal flex items-center justify-center
                        group-hover:bg-teal/80 transition-colors"
        >
          <div className="w-4 h-4 rounded-full border-2 border-ocean relative">
            <div
              className="absolute inset-0"
              style={{ animation: "earth-orbit 5s linear infinite" }}
            >
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal/80" />
            </div>
          </div>
        </div>
        <div>
          <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)] leading-none">
            DEQODE GROUP
          </div>
          <div className="font-display text-base leading-none text-[var(--text)]">
            EARTH<span className="text-teal">.</span>
          </div>
        </div>
      </Link>

      {/* Centre — tagline */}
      <div className="hidden lg:block absolute left-1/2 -translate-x-1/2">
        <span className="font-syne text-[0.6rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">
          Asia-Pacific Climate Displacement Intelligence
        </span>
      </div>

      {/* Right — satellite + auth */}
      <div className="flex items-center gap-6">
        <SatelliteStatus />

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="font-mono text-[0.6rem] tracking-[0.14em] uppercase px-3 py-1.5
                         rounded border border-teal/40 bg-teal/5 text-teal
                         hover:bg-teal/10 transition-colors"
            >
              Dashboard →
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/login"
            className="font-mono text-[0.6rem] tracking-[0.14em] uppercase px-3 py-1.5
                       rounded border border-[var(--border)] text-[var(--text-dim)]
                       hover:border-teal hover:text-teal transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
