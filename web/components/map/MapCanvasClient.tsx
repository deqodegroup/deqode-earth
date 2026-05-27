"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import { useRegisterMap } from "./MapContext";
import type { MapCanvasHandle } from "./MapCanvas";

// MapCanvas requires window (Leaflet) — SSR disabled, must live in a Client Component
const MapCanvas = dynamic(
  () => import("@/components/map/MapCanvas").then((m) => m.MapCanvas),
  { ssr: false }
);

export function MapCanvasClient({ className }: { className?: string }) {
  const registerMap = useRegisterMap();

  // Callback ref — fires whenever the dynamic component mounts/unmounts
  // This ensures the ref is registered after the dynamic import resolves
  const handleRef = useCallback(
    (handle: MapCanvasHandle | null) => {
      registerMap(handle);
    },
    [registerMap]
  );

  return <MapCanvas ref={handleRef} className={className} />;
}
