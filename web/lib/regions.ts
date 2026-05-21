export type RiskLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
export type RegionType = "sids" | "urban_flood" | "managed_retreat" | "case_study";
export type SubRegion =
  | "polynesia"
  | "melanesia"
  | "micronesia"
  | "australia_nz"
  | "southeast_asia"
  | "indian_ocean";

export interface Region {
  slug: string;
  name: string;
  flag: string;
  bbox: [number, number, number, number];
  center: [number, number];
  zoom: number;
  coords: string;
  risk: RiskLevel;
  pop: string;
  eez?: string;
  area?: string;
  isLive: boolean;
  regionType: RegionType;
  subRegion: SubRegion;
  comingSoon?: boolean;
}

export const SUB_REGIONS: Record<SubRegion, string> = {
  polynesia:      "Polynesia",
  melanesia:      "Melanesia",
  micronesia:     "Micronesia",
  australia_nz:   "Australia & NZ",
  southeast_asia: "Southeast Asia",
  indian_ocean:   "Indian Ocean",
};

export const REGIONS: Record<string, Region> = {
  niue: {
    slug: "niue", name: "Niue", flag: "🇳🇺",
    bbox: [-169.9647, -19.155, -169.78, -18.955],
    center: [-19.05, -169.87], zoom: 12,
    coords: "19°03'S 169°52'W", risk: "HIGH",
    pop: "1,500", eez: "~390,000 km²",
    isLive: true, regionType: "sids", subRegion: "polynesia",
  },
  tuvalu: {
    slug: "tuvalu", name: "Tuvalu", flag: "🇹🇻",
    bbox: [179.0, -8.7, 179.3, -8.4],
    center: [-8.52, 179.2], zoom: 13,
    coords: "8°31'S 179°13'E", risk: "CRITICAL",
    pop: "11,000", eez: "~900,000 km²",
    isLive: true, regionType: "sids", subRegion: "polynesia",
  },
  fiji: {
    slug: "fiji", name: "Fiji", flag: "🇫🇯",
    bbox: [177.2, -18.2, 178.0, -17.5],
    center: [-17.85, 177.6], zoom: 10,
    coords: "17°44'S 178°27'E", risk: "HIGH",
    pop: "930,000", eez: "~1,290,000 km²",
    isLive: true, regionType: "sids", subRegion: "melanesia",
  },
  vanuatu: {
    slug: "vanuatu", name: "Vanuatu", flag: "🇻🇺",
    bbox: [168.1, -17.8, 168.5, -17.5],
    center: [-17.73, 168.32], zoom: 11,
    coords: "17°44'S 168°19'E", risk: "HIGH",
    pop: "320,000", eez: "~680,000 km²",
    isLive: true, regionType: "sids", subRegion: "melanesia",
  },
  "solomon-islands": {
    slug: "solomon-islands", name: "Solomon Islands", flag: "🇸🇧",
    bbox: [159.9, -9.5, 160.2, -9.3],
    center: [-9.43, 160.03], zoom: 11,
    coords: "9°26'S 160°02'E", risk: "HIGH",
    pop: "720,000", eez: "~1,590,000 km²",
    isLive: true, regionType: "sids", subRegion: "melanesia",
  },
  palau: {
    slug: "palau", name: "Palau", flag: "🇵🇼",
    bbox: [134.4, 7.0, 134.7, 7.4],
    center: [7.2, 134.55], zoom: 11,
    coords: "7°21'N 134°28'E", risk: "CRITICAL",
    pop: "18,000", eez: "~600,000 km²",
    isLive: true, regionType: "sids", subRegion: "micronesia",
  },
  kiribati: {
    slug: "kiribati", name: "Kiribati", flag: "🇰🇮",
    bbox: [172.9, 1.3, 173.1, 1.5],
    center: [1.42, 172.98], zoom: 12,
    coords: "1°25'N 172°59'E", risk: "CRITICAL",
    pop: "119,000", eez: "~3,440,000 km²",
    isLive: true, regionType: "sids", subRegion: "micronesia",
  },
  "marshall-islands": {
    slug: "marshall-islands", name: "Marshall Islands", flag: "🇲🇭",
    bbox: [171.0, 7.0, 171.4, 7.2],
    center: [7.1, 171.2], zoom: 12,
    coords: "7°06'N 171°12'E", risk: "CRITICAL",
    pop: "42,000", eez: "~2,000,000 km²",
    isLive: true, regionType: "sids", subRegion: "micronesia",
  },
  brisbane: {
    slug: "brisbane", name: "Brisbane Flood Zones", flag: "🇦🇺",
    bbox: [152.6, -27.8, 153.5, -27.2],
    center: [-27.47, 153.02], zoom: 11,
    coords: "27°28'S 153°01'E", risk: "HIGH",
    pop: "2,600,000", area: "~15,826 km²",
    isLive: true, regionType: "urban_flood", subRegion: "australia_nz",
  },
  grantham: {
    slug: "grantham", name: "Grantham", flag: "🇦🇺",
    bbox: [152.1, -27.7, 152.3, -27.5],
    center: [-27.62, 152.18], zoom: 13,
    coords: "27°37'S 152°10'E", risk: "HIGH",
    pop: "~400", area: "~50 km²",
    isLive: true, regionType: "managed_retreat", subRegion: "australia_nz",
  },
};

export const REGION_LIST = Object.values(REGIONS);

export function getRegion(slug: string): Region | undefined {
  return REGIONS[slug];
}

export function getRegionsBySubRegion(subRegion: SubRegion): Region[] {
  return REGION_LIST.filter((r) => r.subRegion === subRegion);
}

export function getLiveRegions(): Region[] {
  return REGION_LIST.filter((r) => r.isLive);
}

export const ACTIVE_SUB_REGIONS: SubRegion[] = [
  "polynesia",
  "melanesia",
  "micronesia",
  "australia_nz",
];

export const COMING_SOON_SUB_REGIONS: SubRegion[] = [
  "southeast_asia",
  "indian_ocean",
];
