"use client";

import { useEffect, useRef } from "react";

interface CoastlineMapProps {
  center: [number, number];
  zoom: number;
  overlayUrl?: string;
  overlayBounds?: [[number, number], [number, number]];
}

export function CoastlineMap({ center, zoom, overlayUrl, overlayBounds }: CoastlineMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const overlayRef   = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: true,
        zoomControl: false,       // we render our own styled controls
        attributionControl: false, // we render our own attribution
      });

      // Esri World Imagery — photorealistic satellite base
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, minZoom: 6 }
      ).addTo(map);

      // Esri reference labels — place names, ocean labels, coastlines
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, minZoom: 6, opacity: 0.9 }
      ).addTo(map);

      // Custom dark zoom control — bottom right, away from HUD badges
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Attribution bottom right, minimal
      L.control.attribution({ position: "bottomright", prefix: false })
        .addAttribution("Imagery © <a href='https://www.esri.com' style='color:#4CB9C0'>Esri</a>")
        .addTo(map);

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

  return <div ref={containerRef} className="w-full" style={{ height: "70vh", minHeight: "520px", maxHeight: "800px" }} />;
}
