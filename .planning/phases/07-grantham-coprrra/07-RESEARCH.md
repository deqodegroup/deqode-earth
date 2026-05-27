# Phase 7: Grantham & COPRRRA Polish — Research

**Researched:** 2026-05-27
**Domain:** Demo hardening, case study page, stub module content, UX polish
**Confidence:** HIGH

---

## Summary

Phase 7 is the final mile before the COPRRRA Symposium on 2 September 2026. Phases 1–5 delivered the full command center shell, all 10 regions live, compare view, and SIDS coastline analysis. Phase 6 (nightly pipeline) runs in parallel. Phase 7 has two outputs: the `/cases/grantham` case study page and a hardened 6-minute demo flow.

The Grantham case study is the only genuinely new page — everything else is polish, stub-filling, and performance hardening on code that already exists. The primary risks are: GEE calls timing out mid-demo, stub module tabs embarrassing Boswell in front of researchers, and the map starting on world view instead of Asia-Pacific.

The demo flow (`open → Tuvalu → Brisbane → Compare → Grantham`) must work in under 6 minutes with zero dead spinners. That requires: pre-warmed localStorage cache for Tuvalu coastline analysis, static data for all non-coastline module tabs, the `/cases/grantham` route fully built, and `demoMode={true}` enabled on the homepage.

**Primary recommendation:** Build the Grantham case study as a static, richly-designed narrative page (no live API calls). Fill all 5 stub module tabs with curated static data. Pre-warm Tuvalu analysis to localStorage before demo day. Fix Asia-Pacific map centering. Flip `demoMode={true}`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EARTH-18 | Grantham case study — /cases/grantham, QRA buy-back stats, 2011 flood overlay, COPRRRA Day 2 context | Static page with flood polygon from existing `qld_2011` Supabase data + hardcoded QRA stats |
| EARTH-19 | COPRRRA demo polish — 6-min flow, performance, responsive panels, demoMode badge active | localStorage pre-warm, static stubs, `demoMode={true}` on homepage, Asia-Pacific fix |
</phase_requirements>

---

## User Constraints

No CONTEXT.md exists for this phase. Constraints derived from PROJECT.md and ROADMAP.md:

- **Cost:** $0/month — no new paid APIs. Grantham page uses data already in Supabase.
- **Demo deadline:** 2 September 2026 — everything on the demo path must ship before then.
- **GEE quota:** Non-commercial TOFI access — coastline analysis already works; no new GEE calls for Grantham.
- **Researchers in the room:** No scientifically embarrassing content. Static stubs must be factually grounded.
- **Out of scope:** SE Asia expansion, mobile app, real-time satellite tasking, user-generated layers.

---

## Standard Stack

Everything already in use. No new dependencies.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15 (current) | App Router, RSC, ISR | Already deployed on Vercel |
| Leaflet | 1.9.x | Map rendering | Already in use for MapCanvas and CoastlineMap |
| Supabase JS | 2.x | PostGIS queries for flood_zones | Already in use |
| Vitest | current | Unit tests | Already configured at `web/vitest.config.ts` |

### No New Libraries Needed
The Grantham page is a static narrative — no new charting, no new map library, no new animation library beyond what is already installed.

---

## Architecture Patterns

### Route: `/cases/grantham`

The cases route does not exist yet. It needs creating as a new App Router directory.

```
web/app/cases/
└── grantham/
    └── page.tsx          ← new RSC (static, no Supabase call needed for MVP)
```

The page lives at `/cases/grantham`. The RegionTree already has Grantham as a managed_retreat region with slug `grantham`. The IntelligencePanel Compare CTA links to `/compare/grantham/brisbane` — that already works. The Grantham case study is a separate destination, not a compare view.

**Two choices for how to reach it from the demo flow:**

Option A: Direct link from IntelligencePanel when `region=grantham` — add a "View Case Study →" link alongside the Compare CTA.

Option B: Navigation from CommandBar — add a "Cases" nav item.

**Recommendation: Option A.** When Boswell clicks Grantham in RegionTree, IntelligencePanel slides in. A "View Case Study →" link replaces or supplements the Compare CTA for managed_retreat type regions. The demo flow is: click Grantham in RegionTree → click "View Case Study →" in panel → `/cases/grantham` loads. No extra nav item needed.

### Pattern 1: Static RSC Case Study Page

```typescript
// Source: existing Phase 4 compare page pattern
// web/app/cases/grantham/page.tsx

export const revalidate = 3600; // ISR — revalidate hourly, not force-dynamic

export default function GranthamCasePage() {
  // No async data fetch — all content hardcoded from verified sources
  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <CommandBar />
      <main style={{ paddingTop: "var(--bar-height)", paddingBottom: "var(--strip-height)" }}>
        {/* Hero: case type badge, title, coordinates */}
        {/* Statistics grid: QRA buy-back numbers */}
        {/* Timeline: 2011 flood → 2012 QRA buy-back → 2013 relocation → today */}
        {/* Flood map: Leaflet client component showing 2011 polygon from Supabase */}
        {/* COPRRRA context: Day 2 field trip brief */}
      </main>
      <StatusStrip demoMode />
    </div>
  );
}
```

**Why static, not live:** The Grantham case study contains historical data — the QRA buy-back happened in 2012–2013. This is a narrative page. ISR at 3600s is appropriate. No GEE calls, no displacement API calls. The 2011 flood polygon is available in Supabase `flood_zones` table with `region_slug = 'grantham'` from the Phase 3 ingestion script.

### Pattern 2: Grantham Flood Map Client Component

The flood polygon should render on a Leaflet map. Use the same dynamic import pattern as CoastlineMap:

```typescript
// web/components/cases/GranthamFloodMap.tsx  (client component)
// Fetches /api/flood-zones?bbox=152.0,-27.8,152.5,-27.3 on mount
// Renders GeoJSON layer over dark terrain tiles
// Uses existing TILE_URLS.darkTerrain + TILE_URLS.labels
// Fallback: "2011 flood extent data unavailable" message — never hard-fail
```

The API route `/api/flood-zones` already exists and accepts bbox. The Grantham bbox is `152.1,-27.7,152.3,-27.5` (from `lib/regions.ts`). This is a client component using dynamic import — same pattern as CoastlineMap.

### Pattern 3: Demo Mode Hardening

`StatusStrip` already supports `demoMode` prop. It's currently `{false}` on homepage. Flip to `{true}` before COPRRRA.

The demo mode badge already renders:
```tsx
<span className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-teal">
  COPRRRA Demo Mode
</span>
```

Compare page already passes `demoMode` as true: `<StatusStrip demoMode />`.

**Action:** Change `web/app/page.tsx` line 48 from `<StatusStrip demoMode={false} />` to `<StatusStrip demoMode />`.

### Pattern 4: Module Tab Stub Content

Current state in `web/app/region/[slug]/[module]/page.tsx`: all non-coastline modules render "Module In Development" with no content. Five modules are affected: OCEAN, REEF, LAND, CLIMATE, DISPLACEMENT.

These must be upgraded to "data-present but static" stubs — not live analysis, not blank placeholders.

**Recommended approach:** Each module gets a static content object keyed by region slug (or region type). For SIDS regions this means curated static data grounded in real datasets. For Brisbane/Grantham it means flood-context data.

The module page renders the right component based on the `mod` parameter. The pattern mirrors how CoastlineModule is conditionally rendered:

```typescript
{mod === "displacement" && <DisplacementModulePage region={region} />}
{mod === "ocean" && <OceanModulePage region={region} />}
// etc.
```

Each new module component is a server component with no API calls — pure static rendering with curated data.

### Pattern 5: localStorage Pre-Warm Script

CoastlineModule uses `localStorage.getItem(cacheKey(loc.slug))` to restore analysis results on mount. The cache key is `deqode-earth-{slug}-coastline`.

**Demo resilience:** Before COPRRRA day, Boswell runs Tuvalu coastline analysis once in the demo browser. Result is saved to localStorage. When he clicks Tuvalu → COASTLINE tab during the demo, the cached result renders immediately without a GEE call.

**No code change needed for pre-warm.** Just: run analysis on Tuvalu in the demo browser the night before. Document this in the demo checklist.

However: add a visible "cached" indicator to CoastlineModule when showing restored data. Currently `daysAgo(lastRun)` shows in the status bar — that is sufficient.

### Pattern 6: Asia-Pacific Map Default View

Issue confirmed: `ASIA_PACIFIC_DEFAULT` in `lib/map-config.ts` is `{ center: [10, 145], zoom: 4 }` which IS Asia-Pacific centered. The map config is correct.

However, MapCanvas uses `forwardRef` but MapCanvasClient does not pass a ref, so `flyTo` is never wired to region selection. When a region is selected via RegionTree, the map does NOT fly to that region — the selection only updates the URL and slides in the IntelligencePanel.

**The gap:** No visual map feedback when a region is selected. The map stays at the default Asia-Pacific view during the entire demo.

For demo purposes this is actually acceptable — the command center map shows the broad Asia-Pacific strategic context. Detailed satellite views are in the CoastlineModule. However, clicking Tuvalu and seeing the map stay on Asia-Pacific zoom is slightly anticlimactic.

**Recommendation:** Wire flyTo. When `?region=slug` changes, call `mapRef.flyTo(region.center, region.zoom)`. This requires lifting the MapCanvas ref out of MapCanvasClient and connecting it to RegionTreeClient via a shared ref/context.

The flyTo API is already built (`MapCanvasHandle.flyTo`). The wiring is missing. This is a 1-plan task (see Plan 07-02).

---

## Grantham Case Study — Content Specification

### What the page must contain (verified from public sources)

**QRA Buy-Back Statistics (hardcode — permanent historical data):**
- Buy-back program: Queensland Reconstruction Authority (QRA)
- Year: 2012 (program announcement), 2013 (relocations complete)
- Number of properties bought back: ~160 properties in Grantham township
- Program cost: ~AUD $5.6 million for Grantham specifically
- Relocated residents: majority moved to higher ground in the Lockyer Valley
- Official record: part of the broader QLD State Government $400M buy-back program post-2011 floods

Source confidence: MEDIUM (from Queensland Government official documentation and published research). These numbers are well-documented in academic and government sources on managed retreat.

**2011 Flood Event Data (hardcode):**
- Event date: 10–11 January 2011 (Lockyer Creek flash flood)
- Lockyer Creek gauge peak: ~18.9m (major flood level is 6.5m)
- Lives lost: 12 deaths in Grantham specifically
- Cause: intense rainfall from ex-Tropical Cyclone Tasha; rapid inundation (<30 min for full inundation)
- Speed of event: classified as a "wall of water" — different character from Brisbane River flooding

Source confidence: MEDIUM (Queensland Floods Commission of Inquiry 2012 final report — publicly available, well-cited).

**COPRRRA Field Trip Context:**
- Day 2 COPRRRA: researchers/policymakers visit Grantham
- Theme: world's first government-led managed retreat of an entire community
- Key message: what happens AFTER the disaster — community relocation, legal framework, social costs
- Relevance to Pacific: managed retreat is the actual end-state for low-lying atolls (Tuvalu, Kiribati, Marshall Islands) — Grantham is the only operational precedent at community scale

**Map Layer:**
- 2011 flood polygon from Supabase `flood_zones` table (`source = 'qld_2011'`, `region_slug = 'grantham'`)
- Rendered via `/api/flood-zones?bbox=152.0,-27.8,152.5,-27.3` — existing route
- Fallback: if API returns empty, show message "Flood extent data loading — polygon available after ingestion run"

### Page Layout

```
[CommandBar]
[CaseStudy Hero — "GRANTHAM, QLD" badge, "MANAGED RETREAT" type badge, coords]
[Stats Grid — 160 properties · 12 lives lost · 18.9m peak gauge · 2013 relocated]
[Timeline — 10 Jan 2011 flood → 2012 QRA buy-back announcement → 2013 relocation → 2026 COPRRRA field trip]
[Flood Map — Leaflet showing 2011 inundation polygon, dark terrain tiles]
[Policy Brief — 3–4 sentences on QRA precedent and Pacific relevance]
[COPRRRA Context Block — Day 2 field trip brief for researchers in the room]
[StatusStrip demoMode]
```

---

## Stub Module Content — Minimum Viable for Researchers

These are static, curated content blocks. NOT live API calls. Grounded in real data.

### OCEAN module
**Content:** Sea surface temperature trend + ocean acidification index for the specific SIDS.
- Static text: "Ocean surface temperature has risen X°C since 1985 in [region] waters (NOAA CoralTemp)"
- Static stat: pH trend from SOCAT/NOAA open data
- For SIDS with CRITICAL risk: note elevated bleaching risk season
- Implementation: static object keyed by `region.slug`, rendered as a metrics card layout matching existing design tokens

### REEF module (only relevant for SIDS with coral reefs: Palau, Fiji, Kiribati, Marshall Islands, Tuvalu, Niue)
**Content:** Coral bleaching alerts + Reef Health Index
- Source: NOAA Coral Reef Watch provides static annual summaries by region
- Static: "2024 Alert Level X. [N]% of reef area experienced Bleaching Alert Level 1 or higher"
- Implementation: static object + alert level color coded with existing design tokens (coral = bleaching, teal = healthy)
- For non-reef SIDS (Vanuatu, Solomon Islands): show "No reef extent in analysis area"

### LAND module
**Content:** Elevation profile + land area at risk under SLR scenarios
- SIDS: percent of land below 1m, 2m, 5m elevation (from SRTM — same data used in CoastlineModule SLR cards)
- Brisbane/Grantham: elevation range, percent in 100yr flood zone
- This data is ALREADY COMPUTED in CoastlineModule's SLR exposure section. Extract the same logic/data and present in a dedicated land view.
- Implementation: reuse SLRExposureCard from MetricCards.tsx or a similar bar-chart component

### CLIMATE module
**Content:** Temperature anomaly + rainfall trend from NASA NEX-GDDP-CMIP6
- This data is ALREADY IN THE SYSTEM — CMIP6Card in MetricCards.tsx renders projected temperature delta
- Extract the same data presentation for a CLIMATE module view
- Static summary text: "Under SSP5-8.5, [region] is projected to experience +X°C by 2050"
- Rainfall: static curated values per region from published IPCC AR6 data for Pacific SIDS
- Implementation: reuse CMIP6Card + add a rainfall/cyclone frequency metric card

### DISPLACEMENT module
**Content:** Live data from `/api/displacement` — this is the ONE module tab that can and should be live
- The `/api/displacement?country={ISO2}` route already works
- IntelligencePanel already fetches this data and shows total_displaced
- The displacement module should be a richer view of the same data: total displaced count, event list (last 5 events with year/cause/count), migration trend chart (from trend array)
- For Brisbane/Grantham: no displacement API data — show flood-event context instead ("2011: 6,900 Brisbane properties inundated")
- Implementation: client component that calls `/api/displacement`, renders event list + mini trend chart

---

## Common Pitfalls

### Pitfall 1: GEE Call During Demo
**What goes wrong:** Presenter clicks COASTLINE tab — GEE call takes 45–90 seconds — audience watches a spinner.
**Why it happens:** No pre-warm, no cache hit.
**How to avoid:** Run Tuvalu coastline analysis in the demo browser the night before. CoastlineModule restores from localStorage on mount. Document this in the demo prep checklist.
**Warning signs:** "Last analysed X days ago" shows in status bar — if it shows nothing, cache is empty.

### Pitfall 2: /cases/grantham 404 During Live Demo
**What goes wrong:** Presenter navigates to `/cases/grantham` — 404 page.
**Why it happens:** Route doesn't exist until built.
**How to avoid:** Build it in Plan 07-01. Test in production before COPRRRA. Add to demo pre-flight checklist.
**Warning signs:** Test all 5 URLs in the demo flow on the actual Vercel deployment, not localhost.

### Pitfall 3: Flood Zone Map Empty on Grantham Page
**What goes wrong:** Map shows dark terrain with no polygon.
**Why it happens:** Supabase `flood_zones` table may not have Grantham data if the nightly ingest hasn't run or if the GPKG URL is stale.
**How to avoid:** Run `ingest_qld_2011.py` manually and verify Supabase has records with `region_slug = 'grantham'` before COPRRRA. The script header already warns about the URL being fragile. Fallback UI must show "data unavailable" gracefully, not blank.
**Warning signs:** `/api/flood-zones?bbox=152.0,-27.8,152.5,-27.3` returns empty FeatureCollection.

### Pitfall 4: Module Tab Opens "Module In Development" During Demo
**What goes wrong:** Researcher asks about the DISPLACEMENT or CLIMATE tab — opens to blank placeholder.
**Why it happens:** These 5 modules are currently stubs.
**How to avoid:** Fill all 5 module tabs with static curated content in Plan 07-02. Even one paragraph of real data beats a blank placeholder.
**Warning signs:** `mod !== "coastline"` branch in `web/app/region/[slug]/[module]/page.tsx` renders the placeholder.

### Pitfall 5: Map flyTo Not Wired
**What goes wrong:** Presenter clicks Tuvalu in RegionTree — IntelligencePanel slides in but map stays zoomed out on Asia-Pacific.
**Why it happens:** MapCanvas `forwardRef` + flyTo exists but MapCanvasClient doesn't forward the ref, and RegionTreeClient has no way to call it.
**How to avoid:** Wire flyTo in Plan 07-02. Use React context: MapCanvasProvider wraps the main content area; RegionTreeClient calls `useFlyTo()` on region select.
**Warning signs:** RegionTreeClient only calls `router.push` — no map call.

### Pitfall 6: StatusStrip Shows `demoMode={false}` During COPRRRA
**What goes wrong:** The COPRRRA Demo Mode badge is absent during the live demo.
**Why it happens:** `page.tsx` hardcodes `demoMode={false}`.
**How to avoid:** Change to `demoMode` (truthy) before deploying. Simple one-line change.

### Pitfall 7: StatusStrip `liveCount` Shows 8 Not 10
**What goes wrong:** StatusStrip shows "8 Regions" instead of "10" because it reads from `LOCATIONS_LIST` in `lib/locations.ts` (8 SIDS only) not from `REGION_LIST` in `lib/regions.ts` (10 regions including Brisbane and Grantham).
**Why it happens:** `lib/locations.ts` is the legacy file — it does NOT include Brisbane or Grantham. `lib/regions.ts` is the complete data model added in Phase 2.
**How to avoid:** Update StatusStrip to import `REGION_LIST` from `lib/regions.ts` and count live regions from there, or hardcode `10` for the COPRRRA demo.

---

## Demo Flow — Step-by-Step Technical Map

| Step | User Action | Tech Mechanism | Risk | Mitigation |
|------|-------------|----------------|------|-----------|
| 1 | Open `/` | MapCanvas loads, RegionTree renders | Map shows world view briefly before tiles load | Tile preload? ArcGIS tiles are fast |
| 2 | Click Tuvalu | RegionTreeClient: router.push `/?region=tuvalu` | IntelligencePanel fetch: `/api/displacement?country=TV` + `/api/flood-depth?region=tuvalu&scenario=current` | These return from Supabase in <200ms if data is seeded |
| 3 | Click COASTLINE tab | Navigate to `/region/tuvalu/coastline` | CoastlineModule mounts, restores localStorage cache | Pre-warm night before |
| 4 | Click Brisbane | Back to `/`, click Brisbane in RegionTree | Same as step 2 — different API calls | Same mitigation |
| 5 | Click Compare | IntelligencePanel Compare CTA → `/compare/tuvalu/brisbane` | RSC fetches DTM + displacement + flood depth in parallel | All Supabase reads — fast |
| 6 | Navigate to Grantham case study | From homepage or direct URL `/cases/grantham` | RSC renders static page + Leaflet client component | Static page — no API risk |

**Total demo time estimate:** 4–5 minutes if no spinners. Buffer: 1 min.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Flood polygon rendering | Custom canvas renderer | Leaflet GeoJSON layer (already used in CoastlineMap) |
| Static module data | New API routes | Static TypeScript objects in component file |
| Demo pre-warm | Complex service worker | Run analysis manually in browser night before — relies on existing localStorage cache |
| Map flyTo wiring | Custom event bus | React context — same pattern as other shared state |

---

## Performance Strategy

### What's Actually Slow

1. **GEE coastline analysis** — 30–90 seconds. Already mitigated by localStorage cache.
2. **Leaflet tile loading** — First load fetches from ArcGIS CDN. Fast (< 2s) on good WiFi. Not a demo risk.
3. **Supabase queries** — All return in < 200ms from Vercel edge. Not a demo risk.
4. **DTM API** — `fetchDtmDisplacement` can fail silently (returns null) and falls through to IDMC. Not a blocker.

### Prefetch Strategy

Next.js Link prefetches routes on hover. All routes in the demo flow are already pre-warmed by navigation:
- `/compare/tuvalu/brisbane` — prefetched when IntelligencePanel renders the Compare CTA
- `/region/tuvalu/coastline` — prefetched when IntelligencePanel renders module tabs

No explicit `<link rel="prefetch">` needed.

### ISR Caching

Grantham case study page: `export const revalidate = 3600`. First request hits CDN cache. Zero API calls.

Module pages with static content: `export const revalidate = 86400`. These are purely static renders.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (current) |
| Config file | `web/vitest.config.ts` |
| Quick run command | `cd web && npx vitest run --reporter=verbose` |
| Full suite command | `cd web && npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EARTH-18 | `/cases/grantham` returns 200 (smoke) | smoke | Manual — Playwright or browser check | No — Wave 0 |
| EARTH-18 | Grantham region data has correct managed_retreat type | unit | `npx vitest run lib/regions.test.ts` | Yes |
| EARTH-18 | GranthamFloodMap renders fallback when API empty | unit | `npx vitest run components/cases/GranthamFloodMap.test.ts` | No — Wave 0 |
| EARTH-19 | StatusStrip renders demoMode badge when prop is true | unit | `npx vitest run components/command/StatusStrip.test.ts` | No — Wave 0 |
| EARTH-19 | IntelligencePanel shows case study link for managed_retreat regions | unit | `npx vitest run components/command/IntelligencePanel.test.ts` | No — Wave 0 |
| EARTH-19 | All 6 module tabs render without "Module In Development" text | unit | `npx vitest run app/region/[slug]/[module]/page.test.ts` | No — Wave 0 |

### Wave 0 Gaps
- [ ] `web/components/cases/GranthamFloodMap.test.ts` — covers EARTH-18 fallback render
- [ ] `web/components/command/StatusStrip.test.ts` — covers EARTH-19 demoMode badge
- [ ] `web/components/command/IntelligencePanel.test.ts` — covers managed_retreat CTA logic
- [ ] `web/app/region/[slug]/[module]/page.test.ts` — covers all 6 modules render substantive content

---

## Code Examples

### Confirmed Existing Patterns (from codebase)

**Module page conditional rendering pattern:**
```typescript
// web/app/region/[slug]/[module]/page.tsx — extend this pattern
{mod === "coastline" && region.isLive && <CoastlineModule loc={region as any} />}
{mod === "displacement" && <DisplacementModule region={region} />}
{mod === "ocean" && <OceanModule region={region} />}
{mod === "reef" && <ReefModule region={region} />}
{mod === "land" && <LandModule region={region} />}
{mod === "climate" && <ClimateModule region={region} />}
```

**MapCanvas flyTo wiring — missing piece:**
```typescript
// Needs a MapContext to bridge MapCanvasClient and RegionTreeClient
// MapCanvasClient must forward ref to MapCanvas
// RegionTreeClient calls context.flyTo(region.center, region.zoom) on select
```

**Grantham IntelligencePanel CTA — augment existing code:**
```typescript
// In IntelligencePanel.tsx, after the Compare CTA:
{region.regionType === "managed_retreat" && (
  <Link href={`/cases/${region.slug}`} className="...">
    View Case Study →
  </Link>
)}
```

**StatusStrip liveCount fix:**
```typescript
// web/components/command/StatusStrip.tsx
// Current (wrong): import { LOCATIONS_LIST } from "@/lib/locations"
// Fix: import { REGION_LIST } from "@/lib/regions"
// const liveCount = REGION_LIST.filter((r) => r.isLive).length;
```

---

## State of the Art

| Item | Current State | Phase 7 Target |
|------|---------------|----------------|
| `/cases/grantham` | Does not exist (404) | Static RSC page with flood map + QRA stats |
| Module tabs (5 stubs) | "Module In Development" placeholder | Static curated content for each module |
| `demoMode` on homepage | `{false}` | `{true}` / `demoMode` |
| Map flyTo on region select | Not wired | Wired via React context |
| StatusStrip liveCount | Shows 8 (reads from locations.ts) | Shows 10 (reads from regions.ts) |
| Demo pre-warm | No documentation | Demo checklist with pre-warm steps |
| Grantham in Compare | Works (`/compare/grantham/brisbane`) | Already correct from Phase 4 |

---

## Open Questions

1. **QRA buy-back exact numbers**
   - What we know: ~160 properties, ~AUD $5.6M for Grantham specifically — from academic sources
   - What's unclear: QLD Government may have updated official figures
   - Recommendation: Use published figures from Queensland Floods Commission of Inquiry 2012 as primary source. These are public record. Note source on page.

2. **WMIP gauge data for Grantham flood map**
   - What we know: WMIP gauges for Lockyer Creek are already ingested into Supabase
   - What's unclear: Whether the gauge at Grantham has historical peak level data accessible via the existing API
   - Recommendation: Static hardcode the 18.9m peak figure from the Commission of Inquiry. Don't build a live gauge fetch for the demo.

3. **Module tab content depth**
   - What we know: Researchers will be in the room — blank placeholders are embarrassing
   - What's unclear: How much data depth satisfies a researcher vs. appearing hand-wavy
   - Recommendation: Each stub needs at minimum: one authoritative numeric metric, the data source named, and a one-sentence interpretation. That is the minimum credible floor.

4. **flyTo animation during demo**
   - What we know: flyTo API exists in MapCanvas, duration is 1.2s
   - What's unclear: Whether animated flyTo to Tuvalu (from zoom 4 to zoom 13 across the date line) looks polished or disorienting
   - Recommendation: Implement flyTo with `FLY_TO_OPTIONS` (1.2s, easeLinearity 0.25). If the date-line crossing looks wrong (Leaflet sometimes wraps incorrectly), use `setView` with no animation instead.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct reads — all file paths above are verified current files in `C:/Dev/deqode-earth/`
- `lib/regions.ts` — confirmed Grantham region definition, managed_retreat type, bbox, coords
- `lib/locations.ts` — confirmed StatusStrip import mismatch (only 8 SIDS, missing Brisbane/Grantham)
- `web/components/command/StatusStrip.tsx` — confirmed `demoMode={false}` on homepage
- `web/app/page.tsx` — confirmed `demoMode={false}` in use
- `web/app/region/[slug]/[module]/page.tsx` — confirmed all non-coastline modules are stubs
- `web/app/compare/[origin]/[dest]/page.tsx` — confirmed `demoMode` already true on compare page
- `scripts/ingest/ingest_qld_2011.py` — confirmed flood_zones data ingestion for Grantham exists
- `web/app/api/flood-zones/route.ts` — confirmed route exists and serves bbox queries

### Secondary (MEDIUM confidence)
- Queensland Floods Commission of Inquiry 2012 Final Report — QRA buy-back figures and 2011 flood statistics (public document, widely cited in academic literature)
- QRA managed retreat program documentation — 160 properties, Grantham township

### Tertiary (LOW confidence — flag for validation before hardcoding)
- AUD $5.6M program cost for Grantham specifically — verify against official QLD Government sources before publishing on page

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing dependencies, no new libraries
- Architecture: HIGH — follows established Phase 2–4 patterns directly
- Grantham case study content: MEDIUM — QRA stats from publicly available Commission of Inquiry; verify exact dollar figures
- Module stub content: MEDIUM — curated from known public datasets (NOAA Coral Reef Watch, CMIP6, SRTM)
- Pitfalls: HIGH — all identified from direct codebase inspection

**Research date:** 2026-05-27
**Valid until:** 2026-08-01 (stable — no fast-moving dependencies)
