export type RiskLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface Location {
  slug: string;
  name: string;
  flag: string;
  bbox: [number, number, number, number]; // [lon_min, lat_min, lon_max, lat_max]
  center: [number, number];               // [lat, lng]
  zoom: number;
  coords: string;
  risk: RiskLevel;
  pop: string;
  eez: string;
  isLive: boolean;
}

export const LOCATIONS: Record<string, Location> = {
  niue: {
    slug: "niue", name: "Niue", flag: "🇳🇺",
    bbox: [-169.9647, -19.155, -169.78, -18.955],
    center: [-19.05, -169.87], zoom: 12,
    coords: "19°03'S 169°52'W", risk: "HIGH",
    pop: "1,500", eez: "~390,000 km²", isLive: true,
  },
  palau: {
    slug: "palau", name: "Palau", flag: "🇵🇼",
    bbox: [134.4, 7.0, 134.7, 7.4],
    center: [7.2, 134.55], zoom: 11,
    coords: "7°21'N 134°28'E", risk: "CRITICAL",
    pop: "18,000", eez: "~600,000 km²", isLive: true,
  },
  fiji: {
    slug: "fiji", name: "Fiji", flag: "🇫🇯",
    bbox: [177.2, -18.2, 178.0, -17.5],
    center: [-17.85, 177.6], zoom: 10,
    coords: "17°44'S 178°27'E", risk: "HIGH",
    pop: "930,000", eez: "~1,290,000 km²", isLive: true,
  },
  tuvalu: {
    slug: "tuvalu", name: "Tuvalu", flag: "🇹🇻",
    bbox: [179.0, -8.7, 179.3, -8.4],
    center: [-8.52, 179.2], zoom: 13,
    coords: "8°31'S 179°13'E", risk: "CRITICAL",
    pop: "11,000", eez: "~900,000 km²", isLive: false,
  },
  kiribati: {
    slug: "kiribati", name: "Kiribati", flag: "🇰🇮",
    bbox: [172.9, 1.3, 173.1, 1.5],
    center: [1.42, 172.98], zoom: 12,
    coords: "1°25'N 172°59'E", risk: "CRITICAL",
    pop: "119,000", eez: "~3,440,000 km²", isLive: false,
  },
  "marshall-islands": {
    slug: "marshall-islands", name: "Marshall Islands", flag: "🇲🇭",
    bbox: [171.0, 7.0, 171.4, 7.2],
    center: [7.1, 171.2], zoom: 12,
    coords: "7°06'N 171°12'E", risk: "CRITICAL",
    pop: "42,000", eez: "~2,000,000 km²", isLive: false,
  },
  vanuatu: {
    slug: "vanuatu", name: "Vanuatu", flag: "🇻🇺",
    bbox: [168.1, -17.8, 168.5, -17.5],
    center: [-17.73, 168.32], zoom: 11,
    coords: "17°44'S 168°19'E", risk: "HIGH",
    pop: "320,000", eez: "~680,000 km²", isLive: false,
  },
  "solomon-islands": {
    slug: "solomon-islands", name: "Solomon Islands", flag: "🇸🇧",
    bbox: [159.9, -9.5, 160.2, -9.3],
    center: [-9.43, 160.03], zoom: 11,
    coords: "9°26'S 160°02'E", risk: "HIGH",
    pop: "720,000", eez: "~1,590,000 km²", isLive: false,
  },
};

export const LOCATIONS_LIST = Object.values(LOCATIONS);
// Niue (live) always first
export const LIVE_FIRST = [...LOCATIONS_LIST].sort((a, b) =>
  a.isLive === b.isLive ? 0 : a.isLive ? -1 : 1
);
