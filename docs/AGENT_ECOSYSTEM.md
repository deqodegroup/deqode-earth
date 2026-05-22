# DEQODE EARTH — Agent Ecosystem Design

**Status:** Design locked, build deferred. Target start: post-Santiago Network outcome (mid-May 2026), after coastline algorithm fix and 8-SIDS activation are complete.

**Why deferred:** Agents on top of broken science industrialise the defect. Foundational work (Priority 2-B coastline fix, remaining 5 SIDS activation, Santiago EOI materials) must ship first.

**Why worth preserving:** This is the architecture that turns EARTH from consulting-style reports into autonomous sovereign monitoring infrastructure — the moat, the multi-year contract story, the 8→20 SIDS scaling path.

---

## The North Star

End user types one plain-English question → gets a ready, audit-trailed, peer-reviewed environmental intelligence brief. Everything else is invisible. No jargon leaks to the surface. No 500 errors. No satellite metadata unless they ask.

---

## The 11-Agent Roster

### Tier 1 — Governance & Interface (user-adjacent)

| # | Agent | Home | Superpower | Owns |
|---|---|---|---|---|
| 1 | **Director** | Paperclip (Group) | Mission traceability, budget approval, mandate enforcement | "Does this task serve Group mission? Is it in budget? Who signs off?" |
| 2 | **Concierge** | Next.js (Vercel) | Natural-language intent parsing; translates "any illegal fishing near Palau?" into a structured mandate | The chat surface users actually touch |

### Tier 2 — Module Specialists (the 4 dashboard services)

| # | Agent | Home | Superpower | Owns |
|---|---|---|---|---|
| 3 | **Ocean/EEZ Specialist** | Cloud Run | Radar vessel detection, EEZ polygon awareness, IUU pattern recognition, AIS cross-ref | Monthly EEZ briefs, real-time ocean anomaly alerts |
| 4 | **Coastline Specialist** | Cloud Run | MNDWI + Otsu + HYCOM tidal filter + connected-components + vectorisation (the Priority-B algorithm) | Erosion reports, infrastructure risk, climate-finance evidence |
| 5 | **Reef Specialist** | Cloud Run | SST anomalies, bleaching alerts (NOAA CRW), turbidity detection | Bleaching watch, reef health briefs |
| 6 | **Land Specialist** | Cloud Run | Flood extent (S1+S2), cyclone damage, vegetation loss, land-change | Disaster response, agriculture monitoring |

### Tier 3 — Cross-cutting Utilities (shared services)

| # | Agent | Home | Superpower | Owns |
|---|---|---|---|---|
| 7 | **Cartographer** | Cloud Run | Tile generation, styled PNG exports for offline, vectorisation to GeoJSON, consistent brand across modules | Every map every specialist ever shows |
| 8 | **Analyst** | Cloud Run (Claude Agent SDK) | Turn metrics into plain-English findings; reject implausible numbers; flag uncertainty honestly | The peer-review layer — nothing ships without it |
| 9 | **Scribe** | Cloud Run (Claude Agent SDK) | Executive briefs, monthly intelligence reports, PDF exports, evidence appendices | Everything that lands in a minister's inbox |
| 10 | **Sentinel** | Supabase + Cloud Run | Full audit trail (who/when/which scene/what conclusion/approved by), drift detection vs baselines | The "defensible in procurement review" layer |
| 11 | **Quartermaster** | Cloud Run | GEE quota tracking, cost forecasting, cache hits, off-peak scheduling | Stops the lights turning off |

---

## Example User Flow

User on Palau dashboard types: **"What's happening in our EEZ this month?"**

```
Concierge    ──► "This is an Ocean/EEZ monthly brief, scope = Palau EEZ,
                  period = last 30 days. Drafting mandate."
     │
     ▼
Director     ──► Checks: mandate = Palau gov licence? ✓  Budget? ✓  Approval route? ✓
                  Assigns task ID, sets human-approval gate before delivery
     │
     ▼
Quartermaster ──► Allocates 4 GEE-hours, schedules in off-peak window, checks cache
     │
     ▼
Ocean Specialist ──► Pulls S1/S2 over Palau EEZ, runs radar vessel detection,
                      anomaly-scores against 12-month baseline, flags 3 hotspots
     │                              │
     ▼                              ▼
Cartographer  ◄── requests      Analyst  ◄── reviews metrics
(tiles + PNG                     ("3 vessel clusters detected outside
 offline exports,                 declared fishing zones, confidence:
 branded map)                     high — 14 clear scenes, 2 cloud-filtered.
                                  Cluster B matches historical IUU pattern.")
     │                              │
     └──────────► Scribe ◄──────────┘
                  (assembles monthly brief: exec summary + 3 hotspot pages
                   + evidence appendix + offline PDF + tile URLs)
                              │
                              ▼
                        Sentinel
                  (logs everything: every scene ID, every number,
                   Analyst's confidence note, Scribe's template version)
                              │
                              ▼
                        Director signs off
                              │
                              ▼
                        Concierge delivers:
               "Palau EEZ monthly brief is ready. 3 areas to review.
                Download PDF | View map | See evidence"
```

Total user actions: **1 question, 1 click to download.** Total user exposure to GEE, gRPC, scene IDs, quotas, Python, Paperclip, or Cloud Run: **zero.**

---

## Mandate Schema — The Spine of Goal Ancestry

Every task traces up the tree. This is what makes output defensible to a Pacific minister or Santiago Network reviewer.

```
Group Mission
  "Sovereign data intelligence serving Pacific communities"
    │
    └── EARTH Mandate
        "Verified environmental intelligence for Pacific SIDS governments"
          │
          ├── Standing order: Palau EEZ monthly brief (Ocean Specialist)
          ├── Standing order: Niue coastline quarterly assessment (Coastline Specialist)
          ├── Ad-hoc: user-requested Fiji reef bleaching check (Reef Specialist)
          └── Event trigger: Cyclone warning → Land Specialist auto-spin
```

Every agent output carries the full chain as metadata. Every report footer cites it. Every audit row links it.

---

## Non-Negotiables (Guard Rails for Government-Facing Work)

1. **Human approval gate before any external send.** Agents draft, Analyst approves, Director signs, human clicks "release."
2. **Every number cites a source scene.** No orphan metrics. Scribe refuses to include unattributed figures.
3. **Uncertainty is disclosed, never hidden.** "14 clear scenes, 4 cloud-contaminated — confidence: high" not "here's the number."
4. **Implausible values get flagged, not published.** Analyst rejects anything >2σ from baseline without a human review.
5. **Rollback is one click.** Every report has version history; any agent can be frozen.
6. **No auto-learning on customer data.** Models don't train on client EEZ patterns without written permission.

---

## Infrastructure Split

```
┌─────────────────────────────────────────────────────────────┐
│  PAPERCLIP (DEQODE Group root — governance/mission layer)   │
│  • Director agent                                           │
│  • Goal ancestry, budget envelopes, approval routing        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP mandates
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  CLOUD RUN (execution layer — Python FastAPI services)      │
│  • Ocean, Coastline, Reef, Land specialists                 │
│  • Cartographer, Analyst, Scribe, Quartermaster             │
│  • Scale-to-zero, Cloud Scheduler for batch, Cloud Tasks    │
│    for queues, Claude Agent SDK for reasoning agents        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  GEE (compute backbone — already in place)                  │
│  Sentinel-1/2, Landsat 8/9, HYCOM, NOAA CRW, MODIS          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (state + audit)                                   │
│  • Auth (live)                                              │
│  • agent_runs, mandates, reports, approvals tables          │
│  • Sentinel writes here                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  NEXT.JS ON VERCEL (user surface)                           │
│  • Concierge chat UI                                        │
│  • Dashboards, report viewer, offline PDF downloads         │
│  • Nothing AI-looking — feels like a government tool        │
└─────────────────────────────────────────────────────────────┘
```

---

## Stress-Free UX Charter

- **One box, one answer.** Concierge takes a plain question. No mode switching, no tool picker.
- **Presets for the 80% case.** "Monthly brief," "Last 7 days," "Since last cyclone" — one click.
- **Progress is human.** "Checking recent satellite passes over Palau..." not "Querying COPERNICUS/S2_SR."
- **Errors are reassuring.** "No clear satellite images this week — we'll retry Friday and email you" not a red 500.
- **Offline-first deliverables.** PDF, static PNG maps, pre-cached tiles. Works on a minister's iPad on a plane.
- **Mobile parity.** Pacific is mobile-heavy. Every flow must work at 375px.
- **No jargon at the surface.** "Ocean activity" not "SAR backscatter." "Coastal change" not "NDWI delta."

---

## Rollout Sequence (When Build Starts)

| Step | Scope | Weeks | Unblocks |
|---|---|---|---|
| 0 | **Fix Coastline algorithm (Priority 2-B)** | 1 | Coastline Specialist can't exist credibly until this ships |
| 1 | **Director + Concierge skeleton** (no agents yet, just routing + mandate table + audit table) | 1 | The whole control plane |
| 2 | **Cartographer + Analyst + Scribe + Sentinel + Quartermaster** (utility layer) | 2 | Every specialist depends on these |
| 3 | **Ocean/EEZ Specialist** (flagship — validates end-to-end loop) | 2 | Proves the pattern, ships first value to Palau/Fiji |
| 4 | **Coastline Specialist** (algorithm already fixed in step 0) | 1 | Niue climate-finance evidence |
| 5 | **Reef Specialist** | 1 | Fiji/Palau bleaching watch |
| 6 | **Land Specialist** | 1 | Cyclone/flood response briefs |

**Total:** ~9 weeks end-to-end, first government-ready output (Ocean) in week 5.

---

## Opinionated Design Calls (Flag Any to Reverse)

1. **Paperclip stays at Group only — never runs specialists.** Governance brain, not execution platform. Keeps laptop-local Paperclip out of the production path.
2. **Cloud Run over Vercel for agent workers.** Vercel Python serverless is fine for single GEE calls; agents need scale-to-zero + longer runtimes + queues. Aligns with Phase 2 plan.
3. **Cartographer is its own agent, not bundled into specialists.** One brand voice across all maps. Specialists don't invent their own map styles.
4. **Analyst is a hard wall between raw metrics and any report.** Nothing ships unreviewed. Non-negotiable after the coastline-numbers lesson.
5. **Sentinel is a separate agent, not a library.** Audit has to be unforgeable. Side-process with its own DB writes means nothing can ship without a log row.
6. **Claude Agent SDK only for reasoning roles** (Concierge, Analyst, Scribe). Specialists stay deterministic Python + GEE — no LLM guessing coastline numbers.
7. **Human approval gate enforced in Director, not UI.** Even if someone bypasses the frontend, Director refuses to release unreviewed output.

---

## Pre-Build Prerequisites (Blocker Checklist)

Before any of this is built, these must be done:

- [ ] Coastline algorithm rewritten to MNDWI + Otsu + HYCOM + connected-components (Priority 2-B)
- [ ] All 8 SIDS activated (Tuvalu, Kiribati, Marshall Islands, Vanuatu, Solomon Islands pending)
- [ ] Santiago Network outcomes known (Fiji 4 May, Palau 15 May)
- [ ] Custom domain `earth.deqode.com` live
- [ ] UX testing session complete
- [ ] Cloud Run project provisioned under `deqode-earth` GCP project
- [ ] Paperclip deployed to stable host (not laptop) if Director lives there
