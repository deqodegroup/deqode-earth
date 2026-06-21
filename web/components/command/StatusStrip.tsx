"use client";

import { useEffect, useState } from "react";
import { REGION_LIST } from "@/lib/regions";

type StatusColor = "teal" | "gold" | "coral" | "dim";

export interface DataHealthSource {
  source: string;
  status: string | null;
  last_success_at: string | null;
}

export function summarizeDataHealth(sources: DataHealthSource[]): {
  color: StatusColor;
  label: string;
} {
  if (!sources.length) {
    return { color: "dim", label: "Data check pending" };
  }

  const current = sources.filter((source) => source.status === "healthy").length;
  if (current === sources.length) {
    return { color: "teal", label: `Data ${current}/${sources.length} current` };
  }

  if (current > 0) {
    return { color: "gold", label: `Data ${current}/${sources.length} current` };
  }

  return { color: "coral", label: "Data sources stale" };
}

export function StatusStrip({ demoMode = false }: { demoMode?: boolean }) {
  const liveCount = REGION_LIST.filter((r) => r.isLive).length;
  const [health, setHealth] = useState<{
    generated_at: string;
    sources: DataHealthSource[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/data-health", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.sources) {
          setHealth(json);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealth(null);
        }
      });

    return () => controller.abort();
  }, []);

  const healthSummary = summarizeDataHealth(health?.sources ?? []);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between
                 px-6 bg-ocean/95 backdrop-blur-sm border-t border-[var(--border)]"
      style={{ height: "var(--strip-height)" }}
    >
      <div className="flex items-center gap-6">
        <StatusPill color="teal" label="S2 Active" />
        <StatusPill color="dim" label={`${liveCount} Regions`} />
        <StatusPill
          color={healthSummary.color}
          label={healthSummary.label}
          title={
            health?.generated_at
              ? `Checked ${new Date(health.generated_at).toLocaleString()}`
              : "Waiting for source health check"
          }
        />
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
  title,
}: {
  color: StatusColor;
  label: string;
  title?: string;
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
    <span
      title={title}
      className={`font-mono text-[0.55rem] tracking-[0.12em] uppercase ${colorClass}`}
    >
      {label}
    </span>
  );
}
