"use client";

import { REGION_LIST } from "@/lib/regions";

export function StatusStrip({ demoMode = false }: { demoMode?: boolean }) {
  const liveCount = REGION_LIST.filter((r) => r.isLive).length;

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between
                 px-6 bg-ocean/95 backdrop-blur-sm border-t border-[var(--border)]"
      style={{ height: "var(--strip-height)" }}
    >
      <div className="flex items-center gap-6">
        <StatusPill color="teal" label="S2 Active" />
        <StatusPill color="dim" label={`${liveCount} Regions`} />
        <StatusPill color="dim" label="Updated on analysis run" />
        {demoMode && <StatusPill color="gold" label="COPRRRA Demo Mode" />}
      </div>

      <div className="hidden md:block">
        <span className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">
          DEQODE GROUP · TOFI · Classification: SOVEREIGN
        </span>
      </div>
    </footer>
  );
}

function StatusPill({
  color,
  label,
}: {
  color: "teal" | "gold" | "coral" | "dim";
  label: string;
}) {
  const colorClass =
    color === "teal"
      ? "text-teal"
      : color === "gold"
        ? "text-gold"
        : color === "coral"
          ? "text-coral"
          : "text-[var(--text-dim)]";

  return (
    <span className={`font-mono text-[0.55rem] tracking-[0.12em] uppercase ${colorClass}`}>
      {label}
    </span>
  );
}
