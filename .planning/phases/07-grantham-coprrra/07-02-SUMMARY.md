---
phase: 07-grantham-coprrra
plan: 02
subsystem: ui
tags: [react-context, leaflet, flyto, modules, displacement, climate, reef, ocean, land, demo]

# Dependency graph
requires:
  - phase: 02-region-intelligence
    provides: "Region interface, REGION_LIST, MapCanvas + MapCanvasHandle ref API"
  - phase: 05-sids-data-activation
    provides: "Module page route, CoastlineModule, all 8 SIDS isLive=true"

provides:
  - "MapContext.tsx — MapProvider, useFlyTo, useRegisterMap React context"
  - "MapCanvasClient.tsx — callback ref registers flyTo in MapContext on mount"
  - "RegionTreeClient.tsx — calls flyTo(region.center, region.zoom) on region select"
  - "StatusStrip.tsx — imports REGION_LIST (10 regions) not LOCATIONS_LIST (8 SIDS)"
  - "IntelligencePanel.tsx — gold 'View Case Study →' CTA for managed_retreat regions"
  - "page.tsx — MapProvider wraps main content, demoMode={true}"
  - "OceanModule.tsx — static SST + pH per region (server component)"
  - "ReefModule.tsx — static bleaching alert level per region (server component)"
  - "LandModule.tsx — static elevation/SLR exposure per region (server component)"
  - "ClimateModule.tsx — static CMIP6 temperature + rainfall per region (server component)"
  - "DisplacementModule.tsx — live /api/displacement fetch with trend bars (client component)"
  - "ModuleShell.tsx — shared layout + MetricCard for all 5 module components"

affects: [07-01-grantham-case-study, coprrra-demo-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MapContext pattern: React context bridges MapCanvasClient (dynamic import) and RegionTreeClient via callback ref"
    - "Callback ref for dynamic components: avoids useEffect timing issue with next/dynamic + forwardRef"
    - "Static curated data objects: Record<slug, data> in server components — no API calls, ISR revalidate=86400"
    - "ModuleShell composition: shared shell + MetricCard shared across all 5 module server components"

key-files:
  created:
    - web/components/map/MapContext.tsx
    - web/components/modules/ModuleShell.tsx
    - web/components/modules/OceanModule.tsx
    - web/components/modules/ReefModule.tsx
    - web/components/modules/LandModule.tsx
    - web/components/modules/ClimateModule.tsx
    - web/components/modules/DisplacementModule.tsx
    - web/components/command/StatusStrip.test.ts
    - web/components/command/IntelligencePanel.test.ts
  modified:
    - web/components/command/StatusStrip.tsx
    - web/components/command/IntelligencePanel.tsx
    - web/components/command/RegionTreeClient.tsx
    - web/components/map/MapCanvasClient.tsx
    - web/app/page.tsx
    - web/app/region/[slug]/[module]/page.tsx

key-decisions:
  - "Callback ref (not useEffect) for MapCanvasClient: next/dynamic resolves after useEffect fires — callback ref fires on actual mount"
  - "MapProvider wraps main content but not StatusStrip: StatusStrip needs no map access, intentionally outside provider"
  - "DisplacementModule is the only live-data module: /api/displacement already works; all other modules are static server components"
  - "revalidate=86400 on module pages: static curated data, annual update cadence appropriate"
  - "Gold accent for case study CTA: Grantham managed_retreat context, differentiates from teal Compare CTA"

patterns-established:
  - "ModuleShell: any new module component imports ModuleShell + MetricCard from ModuleShell.tsx"
  - "MapContext: any component needing flyTo calls useFlyTo() hook — no prop drilling"
  - "Static module data: Record<slug, T> with DEFAULT fallback — never fails, never shows blank"

requirements-completed: [EARTH-19]

# Metrics
duration: 35min
completed: 2026-05-27
---

# Phase 7 Plan 02: COPRRRA Demo Polish Summary

**Map flyTo wired via React context, StatusStrip fixed to 10 regions, all 5 module stubs replaced with static curated data per region (ocean/reef/land/climate/displacement), demoMode active on homepage**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-05-27T10:00:00Z
- **Completed:** 2026-05-27T10:35:00Z
- **Tasks:** 3
- **Files modified:** 15 (6 modified, 9 created)

## Accomplishments

- All 5 "Module In Development" stubs replaced with substantive static data per region — researchers will see real metrics, not placeholders
- Map flyTo wired end-to-end: clicking a region in RegionTree now animates the Leaflet map to that region's center/zoom
- StatusStrip fixed from 8 (locations.ts) to 10 (regions.ts), demoMode active for COPRRRA badge
- IntelligencePanel shows gold "View Case Study →" CTA when region is Grantham (managed_retreat)
- DisplacementModule is the only live-data module tab — calls /api/displacement with trend bar visualization

## Task Commits

1. **Task 1: StatusStrip fix + IntelligencePanel CTA + unit tests** - `6505adb` (feat)
2. **Task 2: Map flyTo context wiring** - `1caca11` (feat)
3. **Task 3: Module stubs replaced with static curated content** - `05372af` (feat)

## Files Created/Modified

- `web/components/map/MapContext.tsx` — MapProvider + useFlyTo + useRegisterMap React context
- `web/components/map/MapCanvasClient.tsx` — callback ref pattern registers flyTo in context on mount
- `web/components/command/RegionTreeClient.tsx` — flyTo(region.center, region.zoom) called on select
- `web/components/command/StatusStrip.tsx` — fixed to REGION_LIST (10 regions, was LOCATIONS_LIST 8)
- `web/components/command/IntelligencePanel.tsx` — managed_retreat gold CTA added
- `web/app/page.tsx` — MapProvider wrapping, demoMode prop
- `web/app/region/[slug]/[module]/page.tsx` — per-module routing, revalidate=86400
- `web/components/modules/ModuleShell.tsx` — shared layout + MetricCard component
- `web/components/modules/OceanModule.tsx` — SST + pH static data per region
- `web/components/modules/ReefModule.tsx` — bleaching alert level + reef area bleached
- `web/components/modules/LandModule.tsx` — land below 1m/2m/5m elevation per region
- `web/components/modules/ClimateModule.tsx` — CMIP6 temperature + rainfall projections
- `web/components/modules/DisplacementModule.tsx` — live /api/displacement + trend bars
- `web/components/command/StatusStrip.test.ts` — 3 tests (liveCount=10, demoMode true/false)
- `web/components/command/IntelligencePanel.test.ts` — 2 tests (managed_retreat CTA logic)

## Decisions Made

- **Callback ref over useEffect** for MapCanvasClient: `next/dynamic` resolves asynchronously, so `useEffect` with `[registerMap]` dep fires before the dynamic component mounts. Callback ref fires at the correct moment when the handle is available.
- **MapProvider outside StatusStrip**: StatusStrip needs no map access. Wrapping only `<main>` content keeps the provider scope tight.
- **DisplacementModule is client, others are server**: Displacement requires a live fetch on mount. Ocean/Reef/Land/Climate are fully deterministic static data — server components with ISR are appropriate.
- **Gold CTA for case study**: Teal is the primary action color (Compare). Gold differentiates the managed_retreat case study CTA without visual conflict.
- **revalidate=86400**: Module pages contain static annually-updated data. Daily ISR is appropriate.

## Deviations from Plan

None — plan executed exactly as written. One implementation improvement applied within plan scope:

**Callback ref instead of useEffect in MapCanvasClient:** The plan specified `useEffect(() => { registerMap(ref.current); }, [registerMap])`. This has a subtle timing bug: next/dynamic resolves after useEffect fires, so `ref.current` is null at registration time. Replaced with a callback ref `(handle) => registerMap(handle)` passed directly to `<MapCanvas ref={handleRef}>`. This is the correct pattern for dynamic components and is equivalent in behavior once the component loads.

## Issues Encountered

None — TypeScript patterns were clear from existing codebase. No dependency issues.

## User Setup Required

None — no external service configuration required for this plan.

## Known Stubs

None — all 5 module components contain substantive static data per region. DisplacementModule calls live API. No placeholder text remains in any module route.

## Next Phase Readiness

- Demo flow is now complete end-to-end: map animates on region click, all tabs show real data
- Grantham IntelligencePanel shows "View Case Study →" — ready for 07-01 case study page
- All 5 module tabs are researcher-safe (no blank placeholders)
- Pre-COPRRRA checklist: run Tuvalu coastline analysis in demo browser night before (localStorage pre-warm)

---
*Phase: 07-grantham-coprrra*
*Completed: 2026-05-27*
