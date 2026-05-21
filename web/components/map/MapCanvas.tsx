"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { ASIA_PACIFIC_DEFAULT, TILE_URLS, FLY_TO_OPTIONS } from "@/lib/map-config";

export interface MapCanvasHandle {
  flyTo: (center: [number, number], zoom: number) => void;
}

interface MapCanvasProps {
  className?: string;
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas({ className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      flyTo(center: [number, number], zoom: number) {
        mapRef.current?.flyTo(center, zoom, FLY_TO_OPTIONS);
      },
    }));

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      import("leaflet").then((mod) => {
        const L = mod.default;
        if (!containerRef.current || mapRef.current) return;

        const map = L.map(containerRef.current, {
          center: ASIA_PACIFIC_DEFAULT.center,
          zoom: ASIA_PACIFIC_DEFAULT.zoom,
          minZoom: ASIA_PACIFIC_DEFAULT.minZoom,
          maxZoom: ASIA_PACIFIC_DEFAULT.maxZoom,
          scrollWheelZoom: true,
          zoomControl: false,
          attributionControl: false,
        });

        // Dark terrain base
        L.tileLayer(TILE_URLS.darkTerrain, { maxZoom: 18 }).addTo(map);

        // Labels overlay
        L.tileLayer(TILE_URLS.labels, {
          maxZoom: 18,
          opacity: 0.7,
        }).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control
          .attribution({ position: "bottomright", prefix: false })
          .addAttribution(
            "Imagery © <a href='https://www.esri.com' style='color:#4CB9C0'>Esri</a>"
          )
          .addTo(map);

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
        aria-label="Asia-Pacific intelligence map"
      />
    );
  }
);
