"use client";

import { useEffect, useRef } from "react";

interface CoastlineMapProps {
  center: [number, number];          // [lat, lon]
  zoom: number;
  overlayUrl?: string;               // transparent RGBA PNG data URI
  overlayBounds?: [[number, number], [number, number]]; // [[lat_min, lon_min], [lat_max, lon_max]]
}

export function CoastlineMap({ center, zoom, overlayUrl, overlayBounds }: CoastlineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const overlayRef   = useRef<any>(null);

  // Initialise map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: true,
      });

      // Esri World Imagery — photorealistic satellite base
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Imagery &copy; <a href='https://www.esri.com'>Esri</a>",
          maxZoom: 18,
          minZoom: 6,
        }
      ).addTo(map);

      // Esri reference labels — place names, coastlines, ocean labels (Google Earth feel)
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, minZoom: 6, opacity: 0.85 }
      ).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        overlayRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add / replace overlay whenever the URL changes
  useEffect(() => {
    if (!overlayUrl || !overlayBounds || !mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!mapRef.current) return;

      if (overlayRef.current) {
        mapRef.current.removeLayer(overlayRef.current);
      }

      overlayRef.current = L.imageOverlay(overlayUrl, overlayBounds, {
        opacity: 0.9,
        interactive: false,
      }).addTo(mapRef.current);
    });
  }, [overlayUrl, overlayBounds]);

  return <div ref={containerRef} className="w-full" style={{ height: "560px" }} />;
}
