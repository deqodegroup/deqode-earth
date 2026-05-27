"use client";

import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import type { MapCanvasHandle } from "./MapCanvas";

interface MapContextValue {
  registerMap: (handle: MapCanvasHandle | null) => void;
  flyTo: (center: [number, number], zoom: number) => void;
}

const MapContext = createContext<MapContextValue>({
  registerMap: () => {},
  flyTo: () => {},
});

export function MapProvider({ children }: { children: ReactNode }) {
  const handleRef = useRef<MapCanvasHandle | null>(null);

  const registerMap = useCallback((handle: MapCanvasHandle | null) => {
    handleRef.current = handle;
  }, []);

  const flyTo = useCallback((center: [number, number], zoom: number) => {
    handleRef.current?.flyTo(center, zoom);
  }, []);

  return (
    <MapContext.Provider value={{ registerMap, flyTo }}>
      {children}
    </MapContext.Provider>
  );
}

export function useFlyTo() {
  return useContext(MapContext).flyTo;
}

export function useRegisterMap() {
  return useContext(MapContext).registerMap;
}
