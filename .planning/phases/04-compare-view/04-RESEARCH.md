# Phase 4: Compare View — Research

**Researched:** 2026-05-22
**Domain:** Next.js App Router dynamic routing, IOM DTM API, side-by-side data layout
**Confidence:** HIGH (routing + wiring), MEDIUM (IOM DTM data coverage), LOW (DTM API public access)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EARTH-13 | /compare/[origin]/[dest] — side-by-side SIDS origin vs Australian destination. IOM DTM displacement count overlay. COPRRRA centrepiece demo. | Routing pattern confirmed; DTM API auth required (see Critical Risk below); data wiring from existing /api/displacement and /api/flood-zones routes is straightforward. |
</phase_requirements>

---

## Summary

Phase 4 builds the COPRRRA demo centrepiece: a `/compare/[origin]/[dest]` page that places SIDS climate displacement intelligence (left) alongside Australian flood risk (right) in a single split-screen layout. The page must show an IOM DTM displacement count in its header.

The routing and layout work are well-understood and low-risk. The project already has all the data APIs needed for both panels (displacement, flood-depth, flood-zones). The **critical unknown** is IOM DTM API access: as of August 2025, DTM API v3.0 requires user registration and a subscription key — it is not an unauthenticated public REST endpoint. Pacific SIDS coverage in the DTM database is also narrow (Fiji confirmed; Tuvalu/Kiribati/Marshall Islands unconfirmed). A robust fallback strategy using the existing `/api/displacement` (IDMC data, already wired in Phase 3) is essential.

The Compare CTA in IntelligencePanel already navigates to `/compare/${region.slug}/brisbane` via a `Link` component — no CTA change needed, just the route must exist.

**Primary recommendation:** Build the /compare/[origin]/[dest] page as a server-fetched split layout; use the existing Supabase displacement_records as the primary header count; treat IOM DTM as an optional enhancement that requires a `DTM_API_KEY` env var and fails gracefully to the existing count if absent or if the country has no DTM coverage.

---

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.3 (in use) | /compare/[origin]/[dest] route, server components, generateStaticParams | Already the project framework |
| React | 19.2.4 | Client components for interactive elements | Already installed |
| Leaflet (raw) | 1.9.4 | Mini-maps in each panel (NOT react-leaflet — project uses raw Leaflet) | Already the project pattern; MapCanvas uses raw Leaflet via dynamic import |
| Tailwind CSS v4 | 4.x | Layout, tokens, design system | Already wired via globals.css |
| @supabase/ssr + supabase-js | 0.10.2 / 2.103.0 | Data fetching from displacement_records and flood_forecasts | Already the data layer |

### No new dependencies required for Phase 4

The split layout, data fetching, and mini-maps can all be built with what is already installed. Do NOT add react-leaflet — the codebase pattern is raw Leaflet with `dynamic(() => import('leaflet'), { ssr: false })`.

### Optional (IOM DTM only if key obtained)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node-fetch / native fetch | built-in Next.js | Call DTM API from server component | Only if DTM_API_KEY env var is set |

---

## Architecture Patterns

### Recommended File Structure

```
web/app/compare/
  [origin]/
    [dest]/
      page.tsx          -- server component; fetches both panels; generateStaticParams
web/components/compare/
  CompareHeader.tsx     -- header with region names + IOM DTM count
  ComparePanel.tsx      -- single panel (reused for left + right)
  CompareMiniMap.tsx    -- client component; raw Leaflet; accepts center + zoom + optional GeoJSON
  DisplacementBar.tsx   -- horizontal bar chart of displacement trend (client)
```

### Pattern 1: Server Component with Parallel Data Fetching

The `/compare/[origin]/[dest]/page.tsx` must be a server component. Fetch both panels' data in parallel using `Promise.all` so the page doesn't serialize requests.

**What:** Server component that awaits params (Next.js 15+ params are Promises), validates both slugs against REGIONS, and fetches displacement + flood-depth data for both sides simultaneously.

**When to use:** Always on this route — avoids client-side loading states for the primary data.

**Example:**
```typescript
// web/app/compare/[origin]/[dest]/page.tsx
import { notFound } from "next/navigation";
import { getRegion, REGION_LIST } from "@/lib/regions";

interface Props {
  params: Promise<{ origin: string; dest: string }>;
}

// Pre-generate all SIDS × Australian destination combos at build time
export async function generateStaticParams() {
  const sids = REGION_LIST.filter(r => r.regionType === "sids");
  const destinations = REGION_LIST.filter(r =>
    r.regionType === "urban_flood" || r.regionType === "managed_retreat"
  );
  return sids.flatMap(o => destinations.map(d => ({ origin: o.slug, dest: d.slug })));
}

export default async function ComparePage({ params }: Props) {
  const { origin, dest } = await params;
  const originRegion = getRegion(origin);
  const destRegion   = getRegion(dest);
  if (!originRegion || !destRegion) notFound();

  const [originData, destData] = await Promise.all([
    fetchDisplacement(originRegion),
    fetchFloodDepth(destRegion),
  ]);

  return <CompareLayout origin={originRegion} dest={destRegion} originData={originData} destData={destData} />;
}
```

**Key detail:** `params` is a `Promise<{ origin: string; dest: string }>` — must be awaited before use. This is the Next.js 15+ pattern confirmed in the existing codebase (`/region/[slug]/page.tsx` already does this).

### Pattern 2: Split Two-Panel Layout

The compare page sits outside the three-panel command center shell. It gets its own full-height layout using `minHeight: "100dvh"` and the existing CSS variables.

```
┌──────────────────────────────────────────────────┐
│ CommandBar (48px)                                │
├────────────────────┬─────────────────────────────┤
│ COMPARISON HEADER  │ (IOM DTM count + route back) │
├────────────────────┴─────────────────────────────┤
│     LEFT PANEL (SIDS)    │  RIGHT PANEL (AUS)    │
│  ┌──────────────────┐   │  ┌──────────────────┐  │
│  │  Mini-Map        │   │  │  Mini-Map        │  │
│  │  (origin.center) │   │  │  (dest.center)   │  │
│  └──────────────────┘   │  └──────────────────┘  │
│  Displacement count     │  Flood zones risk score │
│  Displaced trend        │  Flood depth (100yr)    │
│  Coastline change rate  │  Flood zone area        │
└─────────────────────────┴─────────────────────────┘
│ StatusStrip (32px)                               │
└──────────────────────────────────────────────────┘
```

CSS strategy: `flex h-full` with `flex-1` panels. The two-panel split uses `w-1/2` or `flex-1` columns. Each panel is a `flex-col` with a fixed-height mini-map section (~280px) and scrollable data below.

### Pattern 3: CompareMiniMap (raw Leaflet, client component)

The existing `MapCanvas` is hard-coded to ASIA_PACIFIC_DEFAULT center/zoom and does not accept props. The compare page needs two mini-maps positioned on specific regions.

Build a new `CompareMiniMap` client component that accepts `center`, `zoom`, `bbox` (for fitting), and optionally a GeoJSON FeatureCollection to overlay (Brisbane flood zones). Follow the exact same pattern as `MapCanvas`: dynamic import of Leaflet inside `useEffect`, cleanup on unmount, dark terrain tile.

```typescript
// web/components/compare/CompareMiniMap.tsx
"use client";
import { useEffect, useRef } from "react";
import { TILE_URLS } from "@/lib/map-config";

interface Props {
  center: [number, number];
  zoom: number;
  geojson?: GeoJSON.FeatureCollection | null;
  className?: string;
}
// Leaflet initialised inside useEffect — identical to MapCanvas pattern
```

Do NOT reuse MapCanvasClient — it has no center/zoom props and always defaults to Asia-Pacific. Build a purpose-built mini-map component.

### Pattern 4: IOM DTM Data Fetching (Server-Side, Graceful Fallback)

IOM DTM v3.0 requires a subscription key (API key). It is NOT anonymous-accessible as of August 2025.

**Recommended pattern:**

```typescript
// lib/dtm.ts
export interface DtmResult {
  country: string;
  total_displaced: number;
  source: "dtm" | "supabase_fallback";
  as_of?: string;
}

export async function fetchDtmDisplacement(countryISO3: string): Promise<DtmResult | null> {
  const apiKey = process.env.DTM_API_KEY;
  if (!apiKey) return null; // will trigger fallback

  try {
    const res = await fetch(
      `https://dtm.iom.int/api/displacement?countryCode=${countryISO3}`,
      {
        headers: { "Ocp-Apim-Subscription-Key": apiKey },
        next: { revalidate: 86400 }, // cache 24h
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return { country: countryISO3, total_displaced: json.totalDisplaced ?? 0, source: "dtm" };
  } catch {
    return null;
  }
}
```

**Fallback:** If DTM returns null, the compare header reads `total_displaced` from the existing Supabase `displacement_records` table via `/api/displacement` — the same data already shown in IntelligencePanel. Label it "IDMC data" vs "IOM DTM" so the source is transparent.

### Anti-Patterns to Avoid

- **Do not add react-leaflet.** The codebase uses raw Leaflet via dynamic import. Adding react-leaflet creates a dependency conflict and diverges from the established pattern.
- **Do not use `useEffect` for initial data in the compare page.** The page is a server component — fetch server-side and pass as props. Only wire mini-maps and micro-interactions as client components.
- **Do not call `/api/flood-zones` with Brisbane's full bbox on every compare page load.** The bbox response is large GeoJSON. Either limit with a smaller bbox or cache aggressively with `revalidate: 3600`.
- **Do not block on IOM DTM.** The DTM API key may not be configured, and Pacific SIDS coverage is partial. Always have the Supabase fallback ready.
- **Do not try to reuse `MapCanvas` or `MapCanvasClient` for mini-maps** — they have no center/zoom props and cannot be configured for specific regions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dual-param dynamic route | Custom routing logic | Standard App Router `app/compare/[origin]/[dest]/page.tsx` | App Router handles nested dynamic segments natively |
| Leaflet mini-map isolation | Global map singleton | Separate `useEffect` per component with distinct container refs | Leaflet ties map instance to a specific DOM container |
| Data parallelism | Sequential fetches | `Promise.all([fetchA(), fetchB()])` in server component | Cuts load time by fetching both panels simultaneously |
| IOM DTM error handling | Complex retry logic | Simple try/catch → null → fallback to Supabase | API is unreliable for small Pacific nations; fallback must exist |

---

## IOM DTM API — Critical Risk Assessment

**Confidence: LOW** — dtm.iom.int blocks all WebFetch attempts (403). Information sourced from secondary searches only.

### What is known (MEDIUM confidence from multiple web sources):

- **v3.0 released August 2025.** Previous versions (v1, v2) were tested with simpler POST-based auth. v3 added user registration + subscription key requirement.
- **Base URL pattern:** `https://dtm.iom.int/api/` (v1 used POST to this path)
- **Authentication:** Subscription key passed as `Ocp-Apim-Subscription-Key` header (Azure API Management pattern — common for IOM APIs)
- **Coverage:** 53+ countries, 9 in Asia-Pacific. Fiji confirmed (has a DTM country page). Tuvalu, Kiribati, Marshall Islands, Palau — unconfirmed in the API; these are very small nations with limited DTM field presence.
- **Data type:** Internal displacement figures (IDPs from disasters/conflict), NOT climate migration flows. The DTM counts disaster-triggered displacement events, not long-term climate mobility.
- **Rate limits:** Not publicly documented; typical humanitarian APIs are 1000 req/day for free tier.

### What is unknown (LOW confidence):

- Exact endpoint paths for v3 (need to register and inspect)
- Whether Pacific SIDS like Tuvalu have any records at all in the DTM database
- Whether the API key is free or requires institutional affiliation

### Recommended approach:

1. Register at `dtm.iom.int/data-and-analysis/dtm-api` to obtain a subscription key before implementation
2. Add `DTM_API_KEY` as a Vercel env var
3. Build the `/lib/dtm.ts` fetcher with graceful null return on any failure
4. Use Supabase `displacement_records` (IDMC data, Phase 3) as the confirmed fallback
5. In the compare header, label the count source: show "IOM DTM" if available, "IDMC" otherwise
6. Acceptable for COPRRRA demo: if Tuvalu has no DTM data, show IDMC count with label

### ISO3 codes for Pacific SIDS (needed for DTM API):

| Slug | ISO2 | ISO3 |
|------|------|------|
| tuvalu | TV | TUV |
| fiji | FJ | FJI |
| kiribati | KI | KIR |
| vanuatu | VU | VUT |
| solomon-islands | SB | SLB |
| palau | PW | PLW |
| marshall-islands | MH | MHL |
| niue | NU | NIU |

---

## Wiring Existing APIs into Compare Panels

### Left Panel (SIDS — origin)

| Data | Existing API | Call Pattern |
|------|-------------|-------------|
| Displacement count | `/api/displacement?country={ISO2}` | Server fetch — returns `total_displaced` + `trend[]` |
| Flood/coastal depth | `/api/flood-depth?region={slug}&scenario=current` | Server fetch — returns `depth_m` |
| Coastline status | Not yet available server-side | Show "Coastline analysis available" → link to /region/slug/coastline |

The `/api/displacement` route uses Supabase admin client and returns `total_displaced` (sum of event displacements) and `trend` (annual net_migration series). Both are usable directly in the compare panel without any new API work.

### Right Panel (Australian destination — Brisbane/Grantham)

| Data | Existing API | Call Pattern |
|------|-------------|-------------|
| Flood risk score | `/api/flood-depth?region=brisbane&return_period=100` | Server fetch — returns `depth_m` for 100yr return |
| Flood zone GeoJSON | `/api/flood-zones?bbox=152.6,-27.8,153.5,-27.2` | Limit to Brisbane bbox for mini-map overlay |
| Live gauge | `/api/forecasts/open-meteo` | Optional — river discharge if available |

**Note on flood-zones:** The bbox query returns full PostGIS GeoJSON — potentially large. For the mini-map overlay, pass it as a prop to `CompareMiniMap`. For the COPRRRA demo, Brisbane flood zones make the right panel immediately comprehensible.

---

## Map Behavior Decision

**Recommendation: Two separate mini-maps (one per panel), NOT a single shared map.**

Rationale:
- Origin (e.g. Tuvalu, center -8.52, 179.2, zoom 13) and Brisbane (center -27.47, 153.02, zoom 11) are ~4,500km apart — a shared map showing both simultaneously at any useful zoom level is impossible.
- Two independent mini-maps, each positioned on their region, give researchers the visual context they need.
- Each mini-map uses a fixed height (~280px) within its panel column.
- For the COPRRRA demo, the left mini-map shows the atoll at risk; the right shows Brisbane flood zones overlaid.
- No map synchronisation is needed — these are context maps, not analysis tools.

**Implementation:** Two `CompareMiniMap` instances, each with their own Leaflet map instance tied to a separate container ref. Both use the same dark terrain tiles as the main map.

---

## Compare CTA — Already Wired

IntelligencePanel.tsx line 206–213 already contains:

```tsx
<Link
  href={`/compare/${region.slug}/brisbane`}
  className="block w-full font-mono text-[0.6rem] tracking-[0.14em] uppercase
             text-center py-2.5 rounded border border-teal/40 bg-teal/5
             text-teal hover:bg-teal/10 transition-colors duration-150"
>
  Compare with Brisbane →
</Link>
```

Phase 4 only needs to create the `/compare/[origin]/[dest]` route. The CTA is already pointing to the correct path. No modification of IntelligencePanel is required for the CTA step (success criterion 4).

---

## Common Pitfalls

### Pitfall 1: Leaflet Multiple Map Instances on Same Page

**What goes wrong:** Two Leaflet maps on the same page conflict if they share a container ID or if Leaflet's singleton assumptions are violated.

**Why it happens:** Leaflet 1.x binds map instances to DOM elements by ID. If cleanup (`map.remove()`) is not called on unmount, old instances block new ones.

**How to avoid:** Each `CompareMiniMap` uses its own `useRef<HTMLDivElement>` and calls `map.remove()` in the `useEffect` cleanup. Never use element IDs — always pass the ref's `current` node to `L.map()`. Guard with `if (!containerRef.current || mapRef.current) return;` before initialising.

**Warning signs:** "Map container is already initialized" error in console.

### Pitfall 2: Next.js 15+ params is a Promise

**What goes wrong:** Destructuring `params` directly (`{ params: { origin, dest } }`) causes a TypeScript error and runtime failure.

**Why it happens:** Next.js 15 changed params to be an async Promise to support React Server Components streaming.

**How to avoid:** Always `const { origin, dest } = await params;`. The existing `/region/[slug]/page.tsx` demonstrates this pattern correctly.

### Pitfall 3: IOM DTM API Returns Empty for Small Island States

**What goes wrong:** Fetch to DTM API returns HTTP 200 with an empty array for Tuvalu/Kiribati — total_displaced is 0 or null — and the compare header shows "0 displaced" which is factually misleading.

**Why it happens:** DTM focuses on active displacement crises with field teams. Small Pacific atolls do not have permanent DTM deployments.

**How to avoid:** Check for `total_displaced > 0` before choosing DTM as the source. If DTM returns 0 or null, fall through to IDMC (Supabase) data. Add source labelling so the audience understands what they are seeing.

### Pitfall 4: generateStaticParams Combinatorial Explosion

**What goes wrong:** Generating all SIDS × destination combos (8 SIDS × 2 AU destinations = 16 combos) is fine. But if future regions are added, this grows. Also, the compare route must allow dynamic fallback for non-pre-generated combos.

**How to avoid:** Use `generateStaticParams` for the 8 × 2 = 16 known combos. Keep `dynamicParams = true` (the Next.js default) so unknown combos are rendered on-demand. Do not set `dynamicParams = false`.

### Pitfall 5: Flood Zones GeoJSON is Large

**What goes wrong:** `/api/flood-zones?bbox=152.6,-27.8,153.5,-27.2` returns the full Brisbane flood zone polygon set, potentially hundreds of KB of GeoJSON.

**Why it happens:** The PostGIS RPC returns raw geometry. No simplification was applied in Phase 3.

**How to avoid:** Either (a) skip flood zone overlay on the mini-map and show only a risk score label, or (b) add a `limit` param to the flood-zones RPC and return only the highest-risk zones. For the COPRRRA demo, option (a) is acceptable — the flood depth number conveys the risk without needing polygon overlay.

---

## Code Examples

### CompareMiniMap Skeleton (raw Leaflet, no react-leaflet)

```typescript
// web/components/compare/CompareMiniMap.tsx
"use client";

import { useEffect, useRef } from "react";
import { TILE_URLS } from "@/lib/map-config";

interface Props {
  center: [number, number];
  zoom: number;
  className?: string;
}

export function CompareMiniMap({ center, zoom, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((mod) => {
      const L = mod.default;
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center,
        zoom,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
      });

      L.tileLayer(TILE_URLS.darkTerrain, { maxZoom: 18 }).addTo(map);
      L.tileLayer(TILE_URLS.labels, { maxZoom: 18, opacity: 0.7 }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={`w-full h-full ${className}`} />;
}
```

Wrap in `dynamic(() => import(...), { ssr: false })` at the page level — identical to MapCanvas pattern.

### Route Page Skeleton

```typescript
// web/app/compare/[origin]/[dest]/page.tsx
import { notFound } from "next/navigation";
import { getRegion, REGION_LIST } from "@/lib/regions";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { CompareLayout } from "@/components/compare/CompareLayout";

interface Props {
  params: Promise<{ origin: string; dest: string }>;
}

export async function generateStaticParams() {
  const sids = REGION_LIST.filter(r => r.regionType === "sids");
  const destinations = REGION_LIST.filter(r =>
    r.regionType === "urban_flood" || r.regionType === "managed_retreat"
  );
  return sids.flatMap(o => destinations.map(d => ({ origin: o.slug, dest: d.slug })));
}

export default async function ComparePage({ params }: Props) {
  const { origin, dest } = await params;
  const originRegion = getRegion(origin);
  const destRegion = getRegion(dest);
  if (!originRegion || !destRegion) notFound();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <CommandBar />
      <main style={{ paddingTop: "var(--bar-height)", paddingBottom: "var(--strip-height)" }}
            className="flex-1 flex flex-col overflow-hidden">
        <CompareLayout origin={originRegion} dest={destRegion} />
      </main>
      <StatusStrip demoMode />
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `getStaticPaths` | App Router `generateStaticParams` | Next.js 13+ | Params are typed, async; cleaner per-segment generation |
| `params` as plain object | `params` as `Promise<{...}>` | Next.js 15 | Must await before destructuring — the existing codebase already handles this |
| IOM DTM API anonymous access | DTM v3: subscription key required | August 2025 | Phase 4 needs `DTM_API_KEY` env var; anonymous fallback removed |
| IDMC GIDD only for displacement | IDMC + IOM DTM v3 (dual sources) | 2025 | Can label the source; fallback to IDMC is acceptable |

---

## Open Questions

1. **IOM DTM Pacific coverage**
   - What we know: Fiji has a DTM country page; Tuvalu, Kiribati, Marshall Islands unconfirmed
   - What's unclear: Whether any displacement records exist for the specific Pacific atolls in the DTM database
   - Recommendation: Register for DTM API key immediately, test for Tuvalu (ISO3: TUV) and Kiribati (ISO3: KIR) before implementation. If empty, label the header count as "IDMC displacement events" — this is still meaningful for the COPRRRA audience.

2. **Map interaction on compare page (mobile)**
   - What we know: COPRRRA demo is on desktop 1280px+; mini-maps with dragging/zoom disabled work well for static context
   - What's unclear: Whether researchers will want to pan mini-maps
   - Recommendation: Disable pan/zoom on mini-maps for MVP. Add `pointer-events: none` overlay with "Tap to explore →" link to /region/slug for Phase 7 polish.

3. **Back navigation from compare page**
   - What we know: CommandBar exists and renders on all pages; no "back" button in the current header
   - What's unclear: Whether COPRRRA demo flow needs an explicit back arrow
   - Recommendation: Add a "← Command Center" link in the compare header area. Simple `Link href="/"` is sufficient.

---

## Validation Architecture

> nyquist_validation not set to false in config.json — section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | None detected — tests co-located or in `__tests__/` |
| Quick run command | `cd web && npm run test` |
| Full suite command | `cd web && npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EARTH-13 | /compare/[origin]/[dest] returns 200 for tuvalu/brisbane | smoke | `cd web && npm run test` (add route test) | Wave 0 |
| EARTH-13 | notFound() for invalid origin slug | unit | `cd web && npm run test` | Wave 0 |
| EARTH-13 | CompareLayout renders with mock origin + dest region props | unit | `cd web && npm run test` | Wave 0 |
| EARTH-13 | fetchDtmDisplacement returns null when DTM_API_KEY unset | unit | `cd web && npm run test` | Wave 0 |

### Sampling Rate

- **Per task commit:** `cd web && npm run test`
- **Per wave merge:** `cd web && npm run test`
- **Phase gate:** Full suite green before verification

### Wave 0 Gaps

- [ ] `web/components/compare/__tests__/CompareLayout.test.tsx` — unit test for layout renders with valid props
- [ ] `web/lib/__tests__/dtm.test.ts` — unit tests for DTM fetch with mock fetch, validates null return on missing key
- [ ] `web/app/compare/[origin]/[dest]/__tests__/page.test.tsx` — smoke test for route resolution

---

## Sources

### Primary (HIGH confidence)
- Existing codebase — `web/components/command/IntelligencePanel.tsx` — Compare CTA already implemented at line 206
- Existing codebase — `web/lib/regions.ts` — Region slugs, centers, zoom levels, regionType fields
- Existing codebase — `web/components/map/MapCanvas.tsx` — Leaflet raw pattern (no react-leaflet)
- Existing codebase — `web/app/region/[slug]/page.tsx` — Next.js 15 params-as-Promise pattern
- Existing codebase — `web/app/api/displacement/route.ts`, `flood-depth/route.ts`, `flood-zones/route.ts` — confirmed API shapes
- Next.js official docs (nextjs.org) — generateStaticParams, dynamic routes, params as Promise

### Secondary (MEDIUM confidence)
- Web search (multiple sources) — DTM API v3.0 requires subscription key (August 2025 release)
- Web search — IOM covers 9 Asia-Pacific countries; Fiji DTM page confirmed; Tuvalu unconfirmed
- Web search — DTM API uses Azure API Management pattern (`Ocp-Apim-Subscription-Key` header)

### Tertiary (LOW confidence)
- Web search only — Exact DTM v3 endpoint paths (not verified against live API)
- Web search only — Pacific SIDS coverage in DTM database (no direct access to coverage matrix)

---

## Metadata

**Confidence breakdown:**
- Routing pattern: HIGH — directly observed in existing codebase
- Layout pattern: HIGH — well-established Next.js App Router pattern
- Existing API wiring: HIGH — route shapes confirmed by reading source files
- IOM DTM endpoint paths: LOW — site returns 403, secondary sources only
- IOM DTM Pacific coverage: LOW — Fiji confirmed; others unconfirmed
- Mini-map isolation pattern: HIGH — based on MapCanvas source code

**Research date:** 2026-05-22
**Valid until:** 2026-06-22 (stable stack; DTM API details may shift)

---

## RESEARCH COMPLETE
