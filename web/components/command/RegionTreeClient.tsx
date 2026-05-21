"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Region } from "@/lib/regions";

const RISK_DOT: Record<string, string> = {
  CRITICAL: "bg-coral",
  HIGH:     "bg-gold",
  MODERATE: "bg-sky",
  LOW:      "bg-teal",
};

export function RegionRowClient({ region }: { region: Region }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selected = searchParams.get("region") === region.slug;

  function handleSelect() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("region", region.slug);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      onClick={handleSelect}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-left
                  transition-colors duration-150 cursor-pointer
                  ${selected
                    ? "bg-teal/10 border-r-2 border-teal"
                    : "hover:bg-surface2/50 border-r-2 border-transparent"
                  }`}
      aria-pressed={selected}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${RISK_DOT[region.risk]}`} />
      <span
        className={`font-syne text-[0.7rem] flex-1 truncate
                    ${selected ? "text-[var(--text)]" : "text-[var(--text-mid)]"}`}
      >
        {region.name}
      </span>
      <span className={`font-mono text-[0.55rem] tracking-[0.08em] uppercase flex-shrink-0
                        ${selected ? "text-teal" : "text-[var(--text-dim)]"}`}>
        {region.risk.slice(0, 2)}
      </span>
    </button>
  );
}
