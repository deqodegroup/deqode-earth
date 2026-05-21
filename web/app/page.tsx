import dynamic from "next/dynamic";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";

// MapCanvas requires window — no SSR
const MapCanvas = dynamic(
  () => import("@/components/map/MapCanvas").then((m) => m.MapCanvas),
  { ssr: false }
);

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
        {/* Left: Region Tree placeholder — filled in Phase 2 */}
        <aside
          className="flex-shrink-0 border-r border-[var(--border)] bg-surface/60 overflow-y-auto"
          style={{ width: "var(--tree-width)" }}
          aria-label="Region selector"
        >
          <div className="px-4 pt-5 pb-3">
            <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
              Asia-Pacific
            </div>
          </div>
          {/* RegionTree rendered in Phase 2 */}
        </aside>

        {/* Centre: Full map */}
        <div className="flex-1 relative overflow-hidden">
          <MapCanvas className="absolute inset-0" />
        </div>

        {/* Right: Intelligence Panel placeholder — filled in Phase 2 */}
        {/* IntelligencePanel rendered in Phase 2 */}
      </main>

      <StatusStrip demoMode={false} />
    </div>
  );
}
