"use client";

import { useEffect, useState } from "react";
import type { RiskLevel } from "@/lib/regions";

const RISK_COLOR: Record<RiskLevel, string> = {
  CRITICAL: "text-coral",
  HIGH:     "text-gold",
  MODERATE: "text-sky",
  LOW:      "text-teal",
};

const TIER_BG: Record<RiskLevel, string> = {
  CRITICAL: "border-coral/40 bg-coral/10",
  HIGH:     "border-gold/40 bg-gold/10",
  MODERATE: "border-sky/40 bg-sky/10",
  LOW:      "border-teal/40 bg-teal/10",
};

export function RiskScoreHUD({
  score,
  tier,
}: {
  score: number;
  tier: RiskLevel;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    setDisplayed(0);
    const start = performance.now();
    const duration = 600;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [score]);

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
      <div className="flex flex-col items-center">
        <span className={`font-mono text-3xl font-bold leading-none ${RISK_COLOR[tier]}`}>
          {displayed}
        </span>
        <span className="font-mono text-[0.5rem] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-0.5">
          /100
        </span>
      </div>
      <div>
        <span
          className={`font-mono text-[0.55rem] tracking-[0.14em] uppercase
                      border rounded-full px-2 py-0.5 ${TIER_BG[tier]} ${RISK_COLOR[tier]}`}
        >
          {tier} RISK
        </span>
        <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mt-1">
          Composite score
        </div>
      </div>
    </div>
  );
}
