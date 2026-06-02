"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import { ASIA_PACIFIC_DEFAULT, TILE_URLS, FLY_TO_OPTIONS } from "@/lib/map-config";

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
    const labelsLayerRef = useRef<any>(null);
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
      if (labelsLayerRef.current) map.removeLayer(labelsLayerRef.current);

      if (newMode === "satellite") {
        baseLayerRef.current = L.tileLayer(TILE_URLS.satellite, { maxZoom: 18 }).addTo(map);
        labelsLayerRef.current = L.tileLayer(TILE_URLS.labels, { maxZoom: 18, opacity: 0.8 }).addTo(map);
      } else {
        baseLayerRef.current = L.tileLayer(TILE_URLS.voyager, {
          maxZoom: 18,
          subdomains: "abcd",
          attribution: '© <a href="https://carto.com">CARTO</a> © <a href="https://openstreetmap.org">OSM</a>',
        }).addTo(map);
        labelsLayerRef.current = null;
      }
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

        mapRef.current = map;

        // Initial tile load
        baseLayerRef.current = L.tileLayer(TILE_URLS.voyager, {
          maxZoom: 18,
          subdomains: "abcd",
        }).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.control
          .attribution({ position: "bottomright", prefix: false })
          .addAttribution('© <a href="https://carto.com" style="color:#4CB9C0">CARTO</a> © <a href="https://openstreetmap.org" style="color:#4CB9C0">OSM</a>')
          .addTo(map);

        // Expose L for tile switching
        (mapRef.current as any).__L = L;
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
        {/* Tile mode toggle */}
        <button
          onClick={handleToggle}
          className="absolute top-4 right-4 z-[1000] flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-200"
          style={{
            background: mode === "satellite" ? "rgba(76,185,192,0.15)" : "rgba(255,255,255,0.9)",
            border: "1px solid",
            borderColor: mode === "satellite" ? "rgba(76,185,192,0.4)" : "rgba(0,0,0,0.12)",
            color: mode === "satellite" ? "#4CB9C0" : "#374151",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
          aria-label={`Switch to ${mode === "map" ? "satellite" : "map"} view`}
        >
          <span style={{ fontSize: 11 }}>{mode === "map" ? "SAT" : "MAP"}</span>
        </button>
      </div>
    );
  }
);
