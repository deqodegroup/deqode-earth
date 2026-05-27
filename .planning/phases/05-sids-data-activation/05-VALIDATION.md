---
phase: 05
slug: sids-data-activation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-24
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (already installed, `web/vitest.config.ts` present) |
| **Config file** | `web/vitest.config.ts` — includes `*.test.ts` and `{lib,app,components}/**/*.test.ts` |
| **Quick run command** | `cd web && npx vitest run lib/coastline-metrics.test.ts` |
| **Full suite command** | `cd web && npx vitest run` |
| **Estimated runtime** | ~2 seconds (unit tests only; GEE integration is manual) |

**Note:** GEE Python function (`analyse.py`) cannot be unit-tested in isolation without mocking the GEE SDK. Python tests are integration-only and require the `GEE_B64_KEY` env var. All unit-testable logic (metric derivation, TypeScript type validation, Otsu pure function) runs in the TypeScript/Vitest layer.

---

## Sampling Rate

- **After every task commit:** `cd web && npx vitest run lib/coastline-metrics.test.ts`
- **After every plan wave:** `cd web && npx vitest run`
- **Before `/gsd:verify-work`:** Full suite green + manual API test for all 8 slugs
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-T1 | 01 | 1 | EARTH-14 | unit | `cd web && npx vitest run lib/coastline-metrics.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-01-T2 | 01 | 1 | EARTH-14 | unit | `cd web && npx vitest run lib/coastline-metrics.test.ts components/modules/coastline/CoastlineModule.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-01-T3 | 01 | 1 | EARTH-14 | manual | POST /api/analyse niue — verify algorithm: MNDWI+Otsu in response | Manual | ⬜ pending |
| 05-02-T1 | 02 | 2 | EARTH-15 | unit | `cd web && npx vitest run components/modules/coastline/MetricCards.test.ts` | ❌ Wave 0 | ⬜ pending |
| 05-02-T2 | 02 | 2 | EARTH-15 | unit | `cd web && npx vitest run components/modules/coastline/MetricCards.test.ts` | ✅ created in 05-02-T1 | ⬜ pending |
| 05-02-T3 | 02 | 2 | EARTH-15 | source-grep + unit | `cd web && npx vitest run` (plus grep on analyse.py + locations.ts for 8x "live": True / isLive: true) | Source code | ⬜ pending |
| 05-02-T4 | 02 | 2 | EARTH-15 | manual | POST /api/analyse for all 8 slugs — verify 200 + slr_pct_1m present + frontend StatusStrip/CountryGrid show all 8 live | Manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/lib/coastline-metrics.test.ts` — covers EARTH-14: CoastlineMetrics type shape, metric derivation pure functions, Otsu fallback behavior (threshold outside -0.8..0.8 range) — **created in 05-01-T1**
- [ ] `web/components/modules/coastline/CoastlineModule.test.ts` — covers EARTH-14: spec table value equals "MNDWI+Otsu" — **created in 05-01-T2**
- [ ] `web/components/modules/coastline/MetricCards.test.ts` — covers EARTH-15: SLR card renders when `slr_pct_1m` present, hidden when null — **created in 05-02-T1**

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GEE returns data for all 8 SIDS slugs | EARTH-15 | Requires live GEE_B64_KEY + network | POST to `/api/analyse` for each slug; verify 200 + `coastline_change_rate` present |
| SLR exposure fields non-null in response | EARTH-15 | Requires live GEE SRTM call | POST to `/api/analyse` for niue; verify `slr_pct_1m` present |
| MNDWI coastline visually plausible | EARTH-14 | Pixel-level correctness is visual | Compare coastline overlay before/after on Niue in dev — no inland water false positives |
| Narrow atoll (Tuvalu) returns data | EARTH-15 | Bbox <0.1° — CMIP6 grid may miss | POST to `/api/analyse` for tuvalu; verify no 500 error, graceful null on CMIP6 |
| Frontend display surfaces show all 8 live | EARTH-15 | Visual check on homepage + region pages | Open `/` and `/region/{tuvalu,kiribati,marshall-islands,vanuatu,solomon-islands}` — confirm no "pending" badge on StatusStrip, CountryGrid, CountryHero, ModuleGrid |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
