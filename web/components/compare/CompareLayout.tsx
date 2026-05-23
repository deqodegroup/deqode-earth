import type { Region } from "@/lib/regions";
import type { DtmResult } from "@/lib/dtm";
import type { DisplacementData, FloodDepthData } from "@/lib/compare-data";
import { CompareHeader } from "@/components/compare/CompareHeader";
import { ComparePanel } from "@/components/compare/ComparePanel";
import { PanelDivider } from "@/components/compare/PanelDivider";
import { DisplacementModule } from "@/components/compare/DisplacementModule";
import { TrendModule } from "@/components/compare/TrendModule";
import { CoastlineStatusModule } from "@/components/compare/CoastlineStatusModule";
import { FloodRiskModule } from "@/components/compare/FloodRiskModule";
import { FloodDepthModule } from "@/components/compare/FloodDepthModule";
import { FloodZoneModule } from "@/components/compare/FloodZoneModule";

interface Props {
  origin: Region;
  dest: Region;
  dtm: DtmResult | null;
  originDisplacement: DisplacementData | null;
  destFloodDepth: FloodDepthData | null;
}

export function CompareLayout({
  origin,
  dest,
  dtm,
  originDisplacement,
  destFloodDepth,
}: Props) {
  const fallbackDisplaced = originDisplacement?.total_displaced ?? null;

  return (
    <>
      <CompareHeader
        origin={origin}
        dest={dest}
        dtm={dtm}
        fallbackDisplaced={fallbackDisplaced}
      />
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <ComparePanel
          side="origin"
          region={origin}
          sectionHeading="Climate Displacement"
        >
          <DisplacementModule region={origin} data={originDisplacement} />
          <TrendModule data={originDisplacement} />
          <CoastlineStatusModule region={origin} />
        </ComparePanel>
        <PanelDivider />
        <ComparePanel
          side="dest"
          region={dest}
          sectionHeading="Flood Risk Intelligence"
        >
          <FloodRiskModule region={dest} data={destFloodDepth} />
          <FloodDepthModule data={destFloodDepth} />
          <FloodZoneModule />
        </ComparePanel>
      </div>
    </>
  );
}
