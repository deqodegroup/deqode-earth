import type { Region } from "@/lib/regions";
import Link from "next/link";
import type { ReactNode } from "react";

interface ModuleShellProps {
  region: Region;
  moduleLabel: string;
  sourceNote: string;
  children: ReactNode;
}

export function ModuleShell({ region, moduleLabel, sourceNote, children }: ModuleShellProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-12 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href={`/?region=${region.slug}`}
          className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text-dim)] hover:text-teal transition-colors"
        >
          ← {region.name}
        </Link>
        <span className="text-[var(--text-dim)]">·</span>
        <span className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text-mid)]">
          {moduleLabel}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-teal mb-1">
          {region.flag} {region.name}
        </div>
        <h1 className="font-syne text-3xl font-semibold text-[var(--text)]">{moduleLabel}</h1>
        <p className="font-mono text-[0.55rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mt-1">
          {region.coords}
        </p>
      </div>

      {/* Module content */}
      {children}

      {/* Source attribution */}
      <div className="mt-8 pt-4 border-t border-[var(--border)]">
        <p className="font-mono text-[0.5rem] tracking-[0.08em] uppercase text-[var(--text-dim)]">
          Data sources: {sourceNote} · Static curated intelligence · Updated annually
        </p>
      </div>
    </div>
  );
}

// Shared metric card — used across all module components
export function MetricCard({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface/60 border border-[var(--border)] rounded p-4">
      <div className="font-mono text-[0.5rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mb-1">
        {label}
      </div>
      <div className={`font-syne text-xl font-semibold ${valueClass ?? "text-[var(--text)]"}`}>
        {value}
      </div>
    </div>
  );
}
