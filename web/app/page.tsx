import { Suspense } from "react";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { MapCanvasClient } from "@/components/map/MapCanvasClient";
import { RegionTree } from "@/components/command/RegionTree";
import { IntelligencePanel } from "@/components/command/IntelligencePanel";

export default function CommandCenter() {
  return (
    <div
      className="flex flex-col bg-ocean"
      style={{ minHeight: "100dvh" }}
    >
      <CommandBar />

      {/* Body — region tree + map + intel panel */}
      <main
        className="flex flex-1 overflow-hidden"
        style={{
          paddingTop: "var(--bar-height)",
          paddingBottom: "var(--strip-height)",
        }}
      >
        {/* Left: Region Tree */}
        <aside
          className="flex-shrink-0 border-r border-[var(--border)] bg-surface/60 overflow-y-auto"
          style={{ width: "var(--tree-width)" }}
          aria-label="Region selector"
        >
          <div className="px-4 pt-5 pb-2 border-b border-[var(--border)]">
            <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
              Asia-Pacific
            </div>
          </div>
          <RegionTree />
        </aside>

        {/* Centre: Full map */}
        <div className="flex-1 relative overflow-hidden">
          <MapCanvasClient className="absolute inset-0" />
        </div>

        <Suspense fallback={null}>
          <IntelligencePanel />
        </Suspense>
      </main>

      <StatusStrip demoMode />
    </div>
  );
}
