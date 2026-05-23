"use client";

import dynamic from "next/dynamic";

const CompareMiniMap = dynamic(
  () =>
    import("@/components/compare/CompareMiniMap").then((m) => m.CompareMiniMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-full bg-surface2 animate-pulse"
        aria-label="Loading map"
      />
    ),
  }
);

interface Props {
  center: [number, number];
  zoom: number;
  ariaLabel?: string;
  className?: string;
}

export function CompareMiniMapClient(props: Props) {
  return <CompareMiniMap {...props} />;
}
