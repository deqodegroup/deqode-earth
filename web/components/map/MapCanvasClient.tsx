"use client";

import dynamic from "next/dynamic";

// MapCanvas requires window (Leaflet) — SSR disabled, must live in a Client Component
const MapCanvas = dynamic(
  () => import("@/components/map/MapCanvas").then((m) => m.MapCanvas),
  { ssr: false }
);

export function MapCanvasClient({ className }: { className?: string }) {
  return <MapCanvas className={className} />;
}
