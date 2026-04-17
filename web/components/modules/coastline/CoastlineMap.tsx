"use client";

import { useEffect, useRef } from "react";

interface CoastlineMapProps {
  center: [number, number];
  zoom: number;
  tileUrl?: string;
}

export function CoastlineMap({ center, zoom, tileUrl }: CoastlineMapProps) {
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
        zoomControl: false,
        attributionControl: false,
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

      L.control.zoom({ position: "bottomright" }).addTo(map);

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
    if (!mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!mapRef.current) return;

      if (overlayRef.current) {
        mapRef.current.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }

      if (!tileUrl) return;

      // GEE tile URL format: https://earthengine.googleapis.com/v1/.../tiles/{z}/{x}/{y}
      overlayRef.current = L.tileLayer(tileUrl, {
        opacity: 0.85,
        maxZoom: 18,
        minZoom: 6,
      }).addTo(mapRef.current);
    });
  }, [tileUrl]);

  return <div ref={containerRef} className="w-full" style={{ height: "70vh", minHeight: "520px", maxHeight: "800px" }} />;
}
