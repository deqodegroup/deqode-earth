---
phase: 07-grantham-coprrra
plan: 03
subsystem: ui
tags: [demo, checklist, coprrra, agents-md, state, roadmap, rsc, next-dynamic]

# Dependency graph
requires:
  - phase: 07-grantham-coprrra
    provides: "07-01 /cases/grantham case study page, 07-02 flyTo + module stubs + demoMode all wired"

provides:
  - "web/app/demo/page.tsx — internal COPRRRA demo checklist at /demo (force-static RSC)"
  - "AGENTS.md — Phase 7 section: new files, key decisions, demo readiness"
  - "STATE.md — Phase 07 Complete block, current position updated, 4 new technical decisions"
  - "ROADMAP.md — Phase 7 plans 3/3 complete, progress table row updated"
  - "GranthamFloodMapClient.tsx — Client Component wrapper for next/dynamic ssr:false (build fix)"

affects: [coprrra-demo-flow, future-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "force-static RSC for internal tools: next/dynamic with ssr:false must live in a Client Component — use a thin wrapper (GranthamFloodMapClient)"
    - "Demo checklist page: data-driven DEMO_STEPS array with preWarm flag, failsafe string, action string — filter(s => s.preWarm) renders pre-warm alert block"

key-files:
  created:
    - web/app/demo/page.tsx
    - web/components/cases/GranthamFloodMapClient.tsx
  modified:
    - AGENTS.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - web/app/cases/grantham/page.tsx

key-decisions:
  - "force-static on /demo: internal tool, no ISR needed, pre-rendered at build time"
  - "GranthamFloodMapClient wrapper: RSC cannot use next/dynamic ssr:false — thin Client Component wrapper is the correct pattern"
  - "DEMO_STEPS as typed array: preWarm flag drives conditional pre-warm alert block — single source of truth for both the step card and the pre-warm section"

patterns-established:
  - "Client wrapper for dynamic imports: any RSC needing ssr:false creates a ComponentClient.tsx with use client + next/dynamic"

requirements-completed: [EARTH-19]

# Metrics
duration: 20min
completed: 2026-05-27
---

# Phase 7 Plan 03: COPRRRA Demo Checklist Summary

**Internal /demo checklist page with 6-step COPRRRA flow, pre-warm instructions, and failsafes — Phase 7 complete and demo-ready**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-05-27T11:03:32Z
- **Completed:** 2026-05-27T11:23:00Z
- **Tasks:** 2 (+ 1 auto-fix)
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- /demo internal checklist page renders all 6 demo steps with action descriptions, failsafe instructions, and live URL links that open in new tabs
- Pre-warm alert block surfaces automatically for Step 3 (Tuvalu coastline) — the highest demo risk — with explicit night-before instructions
- AGENTS.md Phase 7 section added: 10 new files documented, 7 key decisions recorded, demo readiness status confirmed
- STATE.md and ROADMAP.md updated: Phase 7 marked complete, progress table shows 3/3 plans, 4 new technical decisions added to Key Technical Decisions
- Build-blocking RSC dynamic import bug from 07-01 auto-fixed: created GranthamFloodMapClient.tsx wrapper so /cases/grantham builds correctly

## Task Commits

1. **Task 1: /demo internal checklist page** - `96466e0` (feat)
2. **Task 2: AGENTS.md + STATE.md + ROADMAP.md updates** - `8815d4e` (chore)
3. **Bug fix: GranthamFloodMapClient wrapper** - `8e6a14b` (fix)

## Files Created/Modified

- `web/app/demo/page.tsx` — force-static RSC demo checklist: 6 steps, pre-warm block, quick URL reference grid, CommandBar + StatusStrip(demoMode) frame
- `web/components/cases/GranthamFloodMapClient.tsx` — Client Component wrapper for next/dynamic ssr:false (auto-fix for build error)
- `web/app/cases/grantham/page.tsx` — updated to import GranthamFloodMapClient instead of using next/dynamic directly in RSC
- `AGENTS.md` — Phase 7 section: 10 new files, 7 key decisions, demo readiness with pre-warm instructions
- `.planning/STATE.md` — Phase 07 Complete block, current position to "Phase 7 complete", 4 new technical decisions, status set to demo-ready
- `.planning/ROADMAP.md` — all 3 Phase 7 plans checked [x], progress table row 7 updated to 3/3 Complete 2026-05-27

## Decisions Made

- **force-static on /demo:** Internal tool only — no auth required, no dynamic data, ISR unnecessary. Pre-rendered at build time for fastest possible load before the presentation.
- **GranthamFloodMapClient pattern:** RSC pages (those with `revalidate` or `dynamic = "force-static"`) cannot call `next/dynamic` with `ssr: false`. The correct fix is a thin `"use client"` wrapper component that does the dynamic import internally. This is the pattern for all future map/Leaflet components embedded in RSC pages.
- **DEMO_STEPS typed array:** Keeping step definitions as a typed array (not JSX inline) allows filtering for `preWarm` steps to power the pre-warm block independently of the step list — single source of truth.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed RSC next/dynamic ssr:false build error in /cases/grantham**
- **Found during:** Build verification after Task 1
- **Issue:** `web/app/cases/grantham/page.tsx` used `next/dynamic` with `{ ssr: false }` directly in a Server Component (the page has `export const revalidate = 3600`). This is disallowed by Next.js RSC rules — Turbopack reports "ssr: false is not allowed with next/dynamic in Server Components".
- **Fix:** Created `web/components/cases/GranthamFloodMapClient.tsx` as a `"use client"` wrapper component that performs the dynamic import. Updated `grantham/page.tsx` to import `GranthamFloodMapClient` instead.
- **Files modified:** `web/components/cases/GranthamFloodMapClient.tsx` (created), `web/app/cases/grantham/page.tsx` (import swapped)
- **Verification:** `npx next build` completes successfully — `/demo` shows as Static (○), `/cases/grantham` shows as Dynamic (ƒ), all routes clean.
- **Committed in:** `8e6a14b` (fix)

---

**Total deviations:** 1 auto-fixed (Rule 1 — pre-existing bug in 07-01 output)
**Impact on plan:** Build-blocking issue would have prevented COPRRRA deployment. Auto-fix is correct and compliant with Next.js RSC rules. No scope creep.

## Issues Encountered

None beyond the auto-fixed build error. Both tasks executed cleanly once the RSC pattern was corrected.

## User Setup Required

None — no external service configuration required for this plan.

## Known Stubs

None — /demo page renders all 6 steps with real content. All data is hardcoded constants (DEMO_STEPS array). No placeholder text.

## Next Phase Readiness

- Phase 7 is fully complete. All three plans shipped.
- COPRRRA demo package is ready: /demo checklist, /cases/grantham case study, all module tabs with real data, map flyTo wired, demoMode active.
- Pre-COPRRRA checklist: open /demo the night before, follow Step 3 pre-warm instructions (Tuvalu coastline analysis in the demo browser).
- Phase 6 (Nightly Agent Pipeline) is the remaining unstarted phase — not on the COPRRRA critical path.

---
*Phase: 07-grantham-coprrra*
*Completed: 2026-05-27*
