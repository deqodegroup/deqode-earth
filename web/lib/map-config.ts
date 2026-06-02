export const ASIA_PACIFIC_DEFAULT = {
  center: [10, 145] as [number, number],
  zoom: 4,
  minZoom: 3,
  maxZoom: 18,
};

export const TILE_URLS = {
  // CartoDB Voyager — clean Google Maps-style road map, familiar to all audiences, free
  voyager:
    "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  // CartoDB DarkMatter — premium dark basemap for night/dark UI contexts
  darkMatter:
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  // Esri satellite — actual photography, max impact for coastline + COPRRRA demos
  satellite:
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  // Esri labels — country/city names overlay, works on top of satellite
  labels:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
};

export const FLY_TO_OPTIONS = {
  duration: 1.2,
  easeLinearity: 0.25,
};
