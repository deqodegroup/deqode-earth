export const ASIA_PACIFIC_DEFAULT = {
  center: [10, 145] as [number, number],
  zoom: 4,
  minZoom: 3,
  maxZoom: 18,
};

export const TILE_URLS = {
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  labels:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  darkTerrain:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
};

export const FLY_TO_OPTIONS = {
  duration: 1.2,
  easeLinearity: 0.25,
};
