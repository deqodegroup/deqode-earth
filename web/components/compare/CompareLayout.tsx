import type { Region } from "@/lib/regions";
import type { DtmResult } from "@/lib/dtm";
import { CompareHeader } from "@/components/compare/CompareHeader";
import { ComparePanel } from "@/components/compare/ComparePanel";
import { PanelDivider } from "@/components/compare/PanelDivider";

interface Props {
  origin: Region;
  dest: Region;
  dtm: DtmResult | null;
  fallbackDisplaced: number | null;
}

export function CompareLayout({
  origin,
  dest,
  dtm,
  fallbackDisplaced,
}: Props) {
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
        />
        <PanelDivider />
        <ComparePanel
          side="dest"
          region={dest}
          sectionHeading="Flood Risk Intelligence"
        />
      </div>
    </>
  );
}
