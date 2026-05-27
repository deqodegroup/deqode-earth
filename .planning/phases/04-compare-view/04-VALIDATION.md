---
phase: 4
slug: compare-view
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `web/vitest.config.ts` (or co-located) |
| **Quick run command** | `cd web && npm run test` |
| **Full suite command** | `cd web && npm run test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd web && npm run test`
- **After every plan wave:** Run `cd web && npm run test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 1 | EARTH-13 | smoke | `cd web && npm run test` | Wave 0 | ⬜ pending |
| 4-01-02 | 01 | 1 | EARTH-13 | unit | `cd web && npm run test` | Wave 0 | ⬜ pending |
| 4-01-03 | 01 | 1 | EARTH-13 | unit | `cd web && npm run test` | Wave 0 | ⬜ pending |
| 4-02-01 | 02 | 2 | EARTH-13 | unit | `cd web && npm run test` | Wave 0 | ⬜ pending |
| 4-02-02 | 02 | 2 | EARTH-13 | visual | manual | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `web/components/compare/__tests__/CompareLayout.test.tsx` — unit test: renders with valid origin + dest region props
- [ ] `web/lib/__tests__/dtm.test.ts` — unit tests: fetchDtmDisplacement returns null when DTM_API_KEY unset; returns null on non-200 response
- [ ] `web/app/compare/[origin]/[dest]/__tests__/page.test.tsx` — smoke test: route resolves for tuvalu/brisbane; notFound() for invalid slug

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Two mini-maps render correct region centers | EARTH-13 | Leaflet DOM rendering cannot be asserted in Vitest without jsdom Leaflet mocking | Open /compare/tuvalu/brisbane in browser; confirm left map shows Tuvalu atoll, right map shows Brisbane |
| IOM DTM label shows "IOM DTM" vs "IDMC" correctly | EARTH-13 | Source label depends on runtime env var and API response | Set/unset DTM_API_KEY, reload, confirm label changes |
| Compare CTA in IntelligencePanel navigates to /compare/[slug]/brisbane | EARTH-13 | Requires real navigation flow | Click a SIDS region → verify Compare button appears → click → confirm URL is /compare/[slug]/brisbane |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
