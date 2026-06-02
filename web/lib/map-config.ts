export const ASIA_PACIFIC_DEFAULT = {
  center: [10, 145] as [number, number],
  zoom: 4,
  minZoom: 3,
  maxZoom: 18,
};

export const TILE_URLS = {
  // Google Maps standard — exact consumer-familiar look, no API key required
  googleMaps: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
  // Google Maps satellite hybrid — labels on imagery
  googleSatellite: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
};

export const GOOGLE_TILE_OPTIONS = {
  subdomains: ["0", "1", "2", "3"],
  maxZoom: 20,
  attribution: '© <a href="https://maps.google.com">Google Maps</a>',
} as const;

export const FLY_TO_OPTIONS = {
  duration: 1.2,
  easeLinearity: 0.25,
};
