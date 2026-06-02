"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import { ASIA_PACIFIC_DEFAULT, TILE_URLS, GOOGLE_TILE_OPTIONS, FLY_TO_OPTIONS } from "@/lib/map-config";

export interface MapCanvasHandle {
  flyTo: (center: [number, number], zoom: number) => void;
}

interface MapCanvasProps {
  className?: string;
}

type TileMode = "map" | "satellite";

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas({ className = "" }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const baseLayerRef = useRef<any>(null);
    const [mode, setMode] = useState<TileMode>("map");
    const modeRef = useRef<TileMode>("map");

    useImperativeHandle(ref, () => ({
      flyTo(center: [number, number], zoom: number) {
        mapRef.current?.flyTo(center, zoom, FLY_TO_OPTIONS);
      },
    }));

    const switchTiles = useCallback((L: any, newMode: TileMode) => {
      const map = mapRef.current;
      if (!map) return;
      if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
      const url = newMode === "satellite" ? TILE_URLS.googleSatellite : TILE_URLS.googleMaps;
      baseLayerRef.current = L.tileLayer(url, GOOGLE_TILE_OPTIONS).addTo(map);
    }, []);

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

        baseLayerRef.current = L.tileLayer(TILE_URLS.googleMaps, GOOGLE_TILE_OPTIONS).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control
          .attribution({ position: "bottomright", prefix: false })
          .addAttribution('© <a href="https://maps.google.com" style="color:#4CB9C0">Google Maps</a>')
          .addTo(map);

        (mapRef.current as any) = map;
        (map as any).__L = L;
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleToggle = useCallback(() => {
      const next: TileMode = modeRef.current === "map" ? "satellite" : "map";
      modeRef.current = next;
      setMode(next);
      const L = (mapRef.current as any)?.__L;
      if (L) switchTiles(L, next);
    }, [switchTiles]);

    return (
      <div className={`relative w-full h-full ${className}`}>
        <div
          ref={containerRef}
          className="w-full h-full"
          aria-label="Asia-Pacific intelligence map"
        />
        <button
          onClick={handleToggle}
          className="absolute top-4 right-4 z-[1000] px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(0,0,0,0.15)",
            color: "#374151",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
          aria-label={`Switch to ${mode === "map" ? "satellite" : "map"} view`}
        >
          {mode === "map" ? "Satellite" : "Map"}
        </button>
      </div>
    );
  }
);
