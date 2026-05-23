"use client";

import { useEffect, useRef } from "react";
import { TILE_URLS } from "@/lib/map-config";

interface Props {
  center: [number, number];
  zoom: number;
  ariaLabel?: string;
  className?: string;
}

export function CompareMiniMap({
  center,
  zoom,
  ariaLabel = "Region context map",
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer(TILE_URLS.darkTerrain, { maxZoom: 18 }).addTo(map);
      L.tileLayer(TILE_URLS.labels, { maxZoom: 18, opacity: 0.7 }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      aria-label={ariaLabel}
    />
  );
}
