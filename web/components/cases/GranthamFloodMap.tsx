"use client";

import { useEffect, useRef, useState } from "react";
import { TILE_URLS } from "@/lib/map-config";

export function GranthamFloodMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    fetch("/api/flood-zones?bbox=152.0,-27.8,152.5,-27.3")
      .then((res) => res.json())
      .then((geojson: { type: string; features: unknown[] }) => {
        if (!geojson?.features || !geojson.features.length) {
          setFallback(true);
          return;
        }

        import("leaflet").then((mod) => {
          const L = mod.default;
          if (!containerRef.current || mapRef.current) return;

          const map = L.map(containerRef.current, {
            center: [-27.62, 152.18],
            zoom: 12,
            scrollWheelZoom: true,
            zoomControl: true,
            attributionControl: false,
          });

          L.tileLayer(TILE_URLS.darkTerrain, {
            maxZoom: 18,
            minZoom: 6,
          }).addTo(map);

          L.tileLayer(TILE_URLS.labels, {
            maxZoom: 18,
            minZoom: 6,
            opacity: 0.85,
          }).addTo(map);

          L.geoJSON(geojson as any, {
            style: {
              color:       "#E05252",
              weight:      1.5,
              fillOpacity: 0.25,
              fillColor:   "#E05252",
            },
          }).addTo(map);

          L.control.attribution({ position: "bottomright", prefix: false })
            .addAttribution("© Esri · QLD Govt 2011 flood data")
            .addTo(map);

          mapRef.current = map;
        });
      })
      .catch(() => {
        setFallback(true);
      });

    return () => {
      const map = mapRef.current;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fallback) {
    return (
      <div className="h-80 flex items-center justify-center bg-surface/40 border border-[var(--border)] rounded font-mono text-[0.6rem] tracking-[0.12em] uppercase text-[var(--text-dim)]">
        Flood extent data unavailable
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-label="2011 Grantham flood extent map"
      className="w-full h-80 rounded overflow-hidden"
    />
  );
}
