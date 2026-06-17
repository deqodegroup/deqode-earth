"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { TILE_URLS, GOOGLE_TILE_OPTIONS } from "@/lib/map-config";
import type { RmacInsightActivity } from "@/lib/rmac/insights";

export function RmacInsightsMap({
  activities,
}: {
  activities: RmacInsightActivity[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [-19.057, -169.92],
        zoom: 13,
        minZoom: 10,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer(TILE_URLS.googleSatellite, GOOGLE_TILE_OPTIONS).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const located = activities.filter(
        (activity) => activity.latitude !== null && activity.longitude !== null
      );
      located.forEach((activity) => {
        const marker = L.circleMarker(
          [activity.latitude as number, activity.longitude as number],
          {
            radius: 8,
            weight: 2,
            color: "#fffefa",
            fillColor: "#d7a84d",
            fillOpacity: 0.95,
          }
        );
        marker
          .bindPopup(
            `<strong>${activity.locationName ?? "Approved activity"}</strong><br>${activity.referenceCode}`
          )
          .addTo(map);
      });

      if (located.length > 1) {
        map.fitBounds(
          located.map((activity) => [
            activity.latitude as number,
            activity.longitude as number,
          ]),
          { padding: [48, 48], maxZoom: 15 }
        );
      }
      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [activities]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      aria-label="Map of approved Alofi South RMAC activities"
    />
  );
}
