# DEQODE EARTH Revamp — Phase 2: Region Tree + Intelligence Panel + Routing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the Command Center with the Asia-Pacific Region Tree, a sliding Intelligence Panel, and refactor routes from `/[country]` to `/region/[slug]`. Add Brisbane and Grantham as new region types.

**Architecture:** `lib/regions.ts` extends `lib/locations.ts` with sub-region grouping and new `regionType` field. `RegionTree` is a Server Component that renders grouped entries. Selecting a region sets URL search params (`?region=slug`) — the Intelligence Panel reads this and slides in. `/region/[slug]` replaces `/[country]` with a redirect from old URLs.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Vitest, TypeScript

**Depends on:** Phase 1 complete (CommandBar, MapCanvas, StatusStrip)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `web/lib/regions.ts` | Asia-Pacific hierarchy, extended Location type, Brisbane + Grantham |
| Create | `web/lib/regions.test.ts` | Tests for region grouping logic |
| Create | `web/components/command/RegionTypeBadge.tsx` | SIDS / FLOOD ZONE / MANAGED RETREAT / CASE STUDY badge |
| Create | `web/components/command/RegionTree.tsx` | Grouped region list with sub-region sections |
| Create | `web/components/command/RegionTreeClient.tsx` | Client leaf — handles selected state + URL update |
| Create | `web/components/command/IntelligencePanel.tsx` | Sliding right panel — risk score + module tabs |
| Create | `web/components/command/RiskScoreHUD.tsx` | Animated composite score display |
| Modify | `web/app/page.tsx` | Wire RegionTree + IntelligencePanel into layout |
| Create | `web/app/region/[slug]/page.tsx` | Region profile page (replaces /[country]) |
| Create | `web/app/region/[slug]/[module]/page.tsx` | Module tab page |
| Modify | `web/app/[country]/page.tsx` | Redirect to /region/[slug] |
| Modify | `web/app/[country]/coastline/page.tsx` | Redirect to /region/[slug]/coastline |

---

## Task 2.1 — Extended Region Data + Asia-Pacific Hierarchy

**Files:**
- Create: `web/lib/regions.ts`
- Create: `web/lib/regions.test.ts`
- Modify: `web/lib/locations.ts`

- [ ] **Step 1: Write failing tests**

Create `web/lib/regions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  REGIONS,
  REGION_LIST,
  getRegionsBySubRegion,
  getRegion,
  SUB_REGIONS,
} from "./regions";

describe("regions", () => {
  it("includes all 8 original SIDS", () => {
    const sids = REGION_LIST.filter((r) => r.regionType === "sids");
    expect(sids.length).toBeGreaterThanOrEqual(8);
  });

  it("includes brisbane as urban_flood", () => {
    expect(REGIONS["brisbane"].regionType).toBe("urban_flood");
  });

  it("includes grantham as managed_retreat", () => {
    expect(REGIONS["grantham"].regionType).toBe("managed_retreat");
  });

  it("getRegionsBySubRegion groups pacific islands correctly", () => {
    const polynesia = getRegionsBySubRegion("polynesia");
    const slugs = polynesia.map((r) => r.slug);
    expect(slugs).toContain("niue");
    expect(slugs).toContain("tuvalu");
  });

  it("getRegion returns undefined for unknown slug", () => {
    expect(getRegion("not-a-place")).toBeUndefined();
  });

  it("all SIDS have bbox defined", () => {
    REGION_LIST.filter((r) => r.regionType === "sids").forEach((r) => {
      expect(r.bbox).toHaveLength(4);
    });
  });
});
```

- [ ] **Step 2: Run test — verify fails**

```bash
cd web && npx vitest run lib/regions.test.ts
```

Expected: `Cannot find module './regions'`

- [ ] **Step 3: Create `web/lib/regions.ts`**

```typescript
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
  bbox: [number, number, number, number]; // [west, south, east, north]
  center: [number, number];               // [lat, lng]
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
  // ── Polynesia ─────────────────────────────────────────
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
  // ── Melanesia ─────────────────────────────────────────
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
  // ── Micronesia ────────────────────────────────────────
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
  // ── Australia & NZ ────────────────────────────────────
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

// Sub-regions that have at least one region defined
export const ACTIVE_SUB_REGIONS: SubRegion[] = [
  "polynesia",
  "melanesia",
  "micronesia",
  "australia_nz",
];

// Coming-soon sub-regions (shown greyed out in tree)
export const COMING_SOON_SUB_REGIONS: SubRegion[] = [
  "southeast_asia",
  "indian_ocean",
];
```

- [ ] **Step 4: Run tests — verify passing**

```bash
cd web && npx vitest run lib/regions.test.ts
```

Expected: 6 passing

- [ ] **Step 5: Commit**

```bash
cd web && git add lib/regions.ts lib/regions.test.ts
git commit -m "feat: Asia-Pacific region hierarchy with Brisbane and Grantham"
```

---

## Task 2.2 — RegionTypeBadge

**Files:**
- Create: `web/components/command/RegionTypeBadge.tsx`

- [ ] **Step 1: Create `web/components/command/RegionTypeBadge.tsx`**

```tsx
import type { RegionType } from "@/lib/regions";

const CONFIG: Record<RegionType, { label: string; className: string }> = {
  sids: {
    label: "SIDS",
    className: "border-teal/40 bg-teal/10 text-teal",
  },
  urban_flood: {
    label: "FLOOD ZONE",
    className: "border-gold/40 bg-gold/10 text-gold",
  },
  managed_retreat: {
    label: "MANAGED RETREAT",
    className: "border-[var(--retreat)]/40 bg-[var(--retreat)]/10 text-[var(--retreat)]",
  },
  case_study: {
    label: "CASE STUDY",
    className: "border-sky/40 bg-sky/10 text-sky",
  },
};

export function RegionTypeBadge({ type }: { type: RegionType }) {
  const { label, className } = CONFIG[type];
  return (
    <span
      className={`font-mono text-[0.5rem] tracking-[0.14em] uppercase
                  border rounded-full px-1.5 py-0.5 whitespace-nowrap ${className}`}
    >
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add components/command/RegionTypeBadge.tsx
git commit -m "feat: RegionTypeBadge — SIDS/FLOOD ZONE/MANAGED RETREAT/CASE STUDY"
```

---

## Task 2.3 — RegionTree

**Files:**
- Create: `web/components/command/RegionTree.tsx`
- Create: `web/components/command/RegionTreeClient.tsx`

- [ ] **Step 1: Create `web/components/command/RegionTreeClient.tsx`**

Client leaf — handles selected state and URL search param.

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { Region } from "@/lib/regions";

const RISK_DOT: Record<string, string> = {
  CRITICAL: "bg-coral",
  HIGH:     "bg-gold",
  MODERATE: "bg-sky",
  LOW:      "bg-teal",
};

export function RegionRowClient({ region }: { region: Region }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selected = searchParams.get("region") === region.slug;

  function handleSelect() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("region", region.slug);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <button
      onClick={handleSelect}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-left
                  transition-colors duration-150 cursor-pointer
                  ${selected
                    ? "bg-teal/10 border-r-2 border-teal"
                    : "hover:bg-surface2/50 border-r-2 border-transparent"
                  }`}
      aria-pressed={selected}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${RISK_DOT[region.risk]}`} />
      <span
        className={`font-syne text-[0.7rem] flex-1 truncate
                    ${selected ? "text-[var(--text)]" : "text-[var(--text-mid)]"}`}
      >
        {region.name}
      </span>
      <span className={`font-mono text-[0.55rem] tracking-[0.08em] uppercase flex-shrink-0
                        ${selected ? "text-teal" : "text-[var(--text-dim)]"}`}>
        {region.risk.slice(0, 2)}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Create `web/components/command/RegionTree.tsx`**

Server Component — renders the full grouped tree.

```tsx
import { Suspense } from "react";
import {
  ACTIVE_SUB_REGIONS,
  COMING_SOON_SUB_REGIONS,
  SUB_REGIONS,
  getRegionsBySubRegion,
} from "@/lib/regions";
import { RegionRowClient } from "./RegionTreeClient";

export function RegionTree() {
  return (
    <nav aria-label="Asia-Pacific region selector" className="py-2">
      {ACTIVE_SUB_REGIONS.map((subRegion) => {
        const regions = getRegionsBySubRegion(subRegion);
        if (!regions.length) return null;
        return (
          <SubRegionGroup
            key={subRegion}
            label={SUB_REGIONS[subRegion]}
            regions={regions}
          />
        );
      })}

      {/* Coming soon sub-regions */}
      {COMING_SOON_SUB_REGIONS.map((subRegion) => (
        <div key={subRegion} className="px-4 py-2 mt-1 opacity-40">
          <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-1">
            {SUB_REGIONS[subRegion]}
          </div>
          <div className="font-syne text-[0.65rem] text-[var(--text-dim)] pl-4">
            Coming soon
          </div>
        </div>
      ))}
    </nav>
  );
}

function SubRegionGroup({
  label,
  regions,
}: {
  label: string;
  regions: ReturnType<typeof getRegionsBySubRegion>;
}) {
  return (
    <div className="mb-2">
      <div className="px-4 pt-3 pb-1.5">
        <span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">
          {label}
        </span>
      </div>
      <Suspense fallback={null}>
        {regions.map((region) => (
          <RegionRowClient key={region.slug} region={region} />
        ))}
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Wire RegionTree into `web/app/page.tsx`**

Replace the `{/* RegionTree rendered in Phase 2 */}` comment:

```tsx
// Add import at top:
import { RegionTree } from "@/components/command/RegionTree";

// Replace aside contents:
<aside
  className="flex-shrink-0 border-r border-[var(--border)] bg-surface/60 overflow-y-auto"
  style={{ width: "var(--tree-width)" }}
  aria-label="Region selector"
>
  <div className="px-4 pt-5 pb-2 border-b border-[var(--border)]">
    <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)]">
      Asia-Pacific
    </div>
  </div>
  <RegionTree />
</aside>
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`. At http://localhost:3000:
- Region Tree shows grouped sections (Polynesia, Melanesia, Micronesia, Australia & NZ)
- SE Asia + Indian Ocean show "Coming soon" greyed out
- Clicking a region sets `?region=slug` in the URL
- Selected row has teal right-border and lighter background

- [ ] **Step 5: Commit**

```bash
cd web && git add components/command/RegionTree.tsx components/command/RegionTreeClient.tsx app/page.tsx
git commit -m "feat: RegionTree with Asia-Pacific sub-region hierarchy and URL-based selection"
```

---

## Task 2.4 — Intelligence Panel + RiskScoreHUD

**Files:**
- Create: `web/components/command/RiskScoreHUD.tsx`
- Create: `web/components/command/IntelligencePanel.tsx`

- [ ] **Step 1: Create `web/components/command/RiskScoreHUD.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { RiskLevel } from "@/lib/regions";

const RISK_COLOR: Record<RiskLevel, string> = {
  CRITICAL: "text-coral",
  HIGH:     "text-gold",
  MODERATE: "text-sky",
  LOW:      "text-teal",
};

const TIER_BG: Record<RiskLevel, string> = {
  CRITICAL: "border-coral/40 bg-coral/10",
  HIGH:     "border-gold/40 bg-gold/10",
  MODERATE: "border-sky/40 bg-sky/10",
  LOW:      "border-teal/40 bg-teal/10",
};

export function RiskScoreHUD({
  score,
  tier,
}: {
  score: number;
  tier: RiskLevel;
}) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    setDisplayed(0);
    const start = performance.now();
    const duration = 600;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [score]);

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border)]">
      <div className="flex flex-col items-center">
        <span className={`font-mono text-3xl font-bold leading-none ${RISK_COLOR[tier]}`}>
          {displayed}
        </span>
        <span className="font-mono text-[0.5rem] tracking-[0.14em] uppercase text-[var(--text-dim)] mt-0.5">
          /100
        </span>
      </div>
      <div>
        <span
          className={`font-mono text-[0.55rem] tracking-[0.14em] uppercase
                      border rounded-full px-2 py-0.5 ${TIER_BG[tier]} ${RISK_COLOR[tier]}`}
        >
          {tier} RISK
        </span>
        <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mt-1">
          Composite score
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `web/components/command/IntelligencePanel.tsx`**

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import { RiskScoreHUD } from "./RiskScoreHUD";
import { RegionTypeBadge } from "./RegionTypeBadge";

// Static risk scores until BigQuery pipeline is live (Phase 3)
const STATIC_SCORES: Record<string, number> = {
  niue: 72, tuvalu: 87, palau: 83, fiji: 65,
  kiribati: 89, "marshall-islands": 85, vanuatu: 68, "solomon-islands": 61,
  brisbane: 64, grantham: 58,
};

const MODULES = [
  { id: "coastline", label: "Coastline" },
  { id: "ocean",     label: "Ocean" },
  { id: "reef",      label: "Reef" },
  { id: "land",      label: "Land" },
  { id: "climate",   label: "Climate" },
  { id: "displacement", label: "Displacement" },
];

export function IntelligencePanel() {
  const searchParams = useSearchParams();
  const slug = searchParams.get("region");
  const region = slug ? REGIONS[slug] : null;

  if (!region) return null;

  const score = STATIC_SCORES[region.slug] ?? 50;

  return (
    <aside
      className="flex-shrink-0 border-l border-[var(--border)] bg-surface/80
                 overflow-y-auto flex flex-col panel-enter"
      style={{ width: "var(--panel-width)" }}
      aria-label="Intelligence panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="font-syne text-sm font-semibold text-[var(--text)] leading-tight">
              {region.name}
            </div>
            <div className="font-mono text-[0.55rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mt-0.5">
              {region.coords}
            </div>
          </div>
          <RegionTypeBadge type={region.regionType} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <StatCell label="Population" value={region.pop} />
          {region.eez && <StatCell label="EEZ" value={region.eez} />}
          {region.area && <StatCell label="Area" value={region.area} />}
        </div>
      </div>

      {/* Risk score */}
      <RiskScoreHUD score={score} tier={region.risk} />

      {/* Module tabs */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="font-mono text-[0.5rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-3">
          Intelligence Modules
        </div>
        <div className="flex flex-wrap gap-2">
          {MODULES.map((mod) => (
            <Link
              key={mod.id}
              href={`/region/${region.slug}/${mod.id}`}
              className="font-mono text-[0.55rem] tracking-[0.1em] uppercase
                         px-2.5 py-1.5 rounded border border-[var(--border)]
                         text-[var(--text-dim)] hover:border-teal hover:text-teal
                         transition-colors duration-150"
            >
              {mod.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Compare CTA */}
      <div className="p-4 mt-auto">
        <Link
          href={`/compare/${region.slug}/brisbane`}
          className="block w-full font-mono text-[0.6rem] tracking-[0.14em] uppercase
                     text-center py-2.5 rounded border border-teal/40 bg-teal/5
                     text-teal hover:bg-teal/10 transition-colors duration-150"
        >
          Compare with Brisbane →
        </Link>
      </div>
    </aside>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">
        {label}
      </div>
      <div className="font-syne text-xs text-[var(--text)]">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Wire IntelligencePanel into `web/app/page.tsx`**

```tsx
// Add imports:
import { Suspense } from "react";
import { RegionTree } from "@/components/command/RegionTree";
import { IntelligencePanel } from "@/components/command/IntelligencePanel";

// In the main flex row, after the MapCanvas div add:
<Suspense fallback={null}>
  <IntelligencePanel />
</Suspense>
```

- [ ] **Step 4: Verify in browser**

- Select Tuvalu from tree → Intelligence Panel slides in from right
- Risk score animates from 0 to 87 over 600ms
- CRITICAL RISK badge shows in coral
- Module tab links render
- Compare with Brisbane CTA at bottom
- Selecting Brisbane shows FLOOD ZONE badge in gold

- [ ] **Step 5: Commit**

```bash
cd web && git add components/command/RiskScoreHUD.tsx components/command/IntelligencePanel.tsx app/page.tsx
git commit -m "feat: IntelligencePanel with RiskScoreHUD, module tabs, compare CTA"
```

---

## Task 2.5 — Route Refactor `/region/[slug]`

**Files:**
- Create: `web/app/region/[slug]/page.tsx`
- Create: `web/app/region/[slug]/[module]/page.tsx`
- Modify: `web/app/[country]/page.tsx` (redirect)
- Modify: `web/app/[country]/coastline/page.tsx` (redirect)

- [ ] **Step 1: Create `web/app/region/[slug]/page.tsx`**

```tsx
import { notFound, redirect } from "next/navigation";
import { getRegion, REGION_LIST } from "@/lib/regions";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return REGION_LIST.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = getRegion(slug);
  if (!region) return {};
  return {
    title: `${region.name} — DEQODE EARTH`,
    description: `Climate displacement intelligence for ${region.name}.`,
  };
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = getRegion(slug);
  if (!region) notFound();

  // Redirect to command center with region pre-selected
  redirect(`/?region=${slug}`);
}
```

- [ ] **Step 2: Create `web/app/region/[slug]/[module]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getRegion, REGION_LIST } from "@/lib/regions";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { CoastlineModule } from "@/components/modules/coastline/CoastlineModule";
import type { Metadata } from "next";

const VALID_MODULES = ["coastline", "ocean", "reef", "land", "climate", "displacement"];

interface Props {
  params: Promise<{ slug: string; module: string }>;
}

export async function generateStaticParams() {
  return REGION_LIST.flatMap((r) =>
    VALID_MODULES.map((mod) => ({ slug: r.slug, module: mod }))
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, module: mod } = await params;
  const region = getRegion(slug);
  if (!region) return {};
  return {
    title: `${region.name} · ${mod.charAt(0).toUpperCase() + mod.slice(1)} — DEQODE EARTH`,
  };
}

export default async function ModulePage({ params }: Props) {
  const { slug, module: mod } = await params;
  const region = getRegion(slug);
  if (!region || !VALID_MODULES.includes(mod)) notFound();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <CommandBar />
      <main
        className="flex-1 overflow-auto"
        style={{ paddingTop: "var(--bar-height)", paddingBottom: "var(--strip-height)" }}
      >
        {mod === "coastline" && region.isLive && (
          <CoastlineModule loc={region as any} />
        )}
        {mod === "coastline" && !region.isLive && (
          <div className="max-w-2xl mx-auto px-16 py-20 text-center">
            <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-4">
              Analysis Pending
            </div>
            <h1 className="font-display text-3xl text-[var(--text)]">
              {region.name} — Coastline Module
            </h1>
            <p className="font-sans text-sm text-[var(--text-mid)] mt-4">
              Data ingestion in progress. This region will be activated shortly.
            </p>
          </div>
        )}
        {mod !== "coastline" && (
          <div className="max-w-2xl mx-auto px-16 py-20 text-center">
            <div className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-4">
              Module In Development
            </div>
            <h1 className="font-display text-3xl text-[var(--text)]">
              {region.name} · {mod.charAt(0).toUpperCase() + mod.slice(1)} Intelligence
            </h1>
          </div>
        )}
      </main>
      <StatusStrip />
    </div>
  );
}
```

- [ ] **Step 3: Update `web/app/[country]/page.tsx` to redirect**

Replace the entire file:

```tsx
import { redirect } from "next/navigation";
import { REGIONS } from "@/lib/regions";

interface Props {
  params: Promise<{ country: string }>;
}

// Keep generating static params so old URLs don't 404 before redirect
export async function generateStaticParams() {
  return Object.keys(REGIONS).map((slug) => ({ country: slug }));
}

export default async function LegacyCountryPage({ params }: Props) {
  const { country } = await params;
  redirect(`/region/${country}`);
}
```

- [ ] **Step 4: Update `web/app/[country]/coastline/page.tsx` to redirect**

```tsx
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ country: string }>;
}

export default async function LegacyCoastlinePage({ params }: Props) {
  const { country } = await params;
  redirect(`/region/${country}/coastline`);
}
```

- [ ] **Step 5: Verify redirects work**

```bash
npm run dev
```

- Navigate to http://localhost:3000/niue → redirects to http://localhost:3000/?region=niue
- Navigate to http://localhost:3000/niue/coastline → redirects to http://localhost:3000/region/niue/coastline
- Navigate to http://localhost:3000/region/niue/coastline → shows CoastlineModule

- [ ] **Step 6: Commit**

```bash
cd web && git add app/region/ app/\[country\]/
git commit -m "feat: /region/[slug] routing with legacy /[country] redirects"
```

---

## Phase 2 Complete

Verify before moving to Phase 3:
- [ ] `npx vitest run` — all tests passing
- [ ] `npm run build` — clean build, no TS errors
- [ ] Command center at / shows full region tree + map
- [ ] Clicking Tuvalu → panel slides in, score animates to 87
- [ ] Clicking Brisbane → panel shows FLOOD ZONE badge
- [ ] /niue → redirects to /?region=niue
- [ ] /region/niue/coastline → shows CoastlineModule
