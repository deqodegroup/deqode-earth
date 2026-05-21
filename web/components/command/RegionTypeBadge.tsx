import type { RegionType } from "@/lib/regions";

const CONFIG: Record<RegionType, { label: string; className: string }> = {
  sids: {
    label: "SIDS",
    className: "border-teal/40 bg-teal/10 text-teal",
  },
  urban_flood: {
    label: "FLOOD ZONE",
    className: "border-gold/40 bg-gold/10 text-gold",
  },
  managed_retreat: {
    label: "MANAGED RETREAT",
    className: "border-[var(--retreat)]/40 bg-[var(--retreat)]/10 text-[var(--retreat)]",
  },
  case_study: {
    label: "CASE STUDY",
    className: "border-sky/40 bg-sky/10 text-sky",
  },
};

export function RegionTypeBadge({ type }: { type: RegionType }) {
  const { label, className } = CONFIG[type];
  return (
    <span
      className={`font-mono text-[0.5rem] tracking-[0.14em] uppercase
                  border rounded-full px-1.5 py-0.5 whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}
