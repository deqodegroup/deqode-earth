# DEQODE EARTH — Revamp Design Spec
**Date:** 2026-05-20  
**Author:** Boswell Haiosi · DEQODE GROUP · The Orator Foundation Inc (TOFI)  
**Ship target:** 2 September 2026 — COPRRRA Inaugural Symposium, Brisbane

---

## 1. Strategic Context

DEQODE EARTH is the digital intelligence layer for climate-related relocation and retreat in the Asia-Pacific. It connects two hemispheres of data that no other platform combines:

- **Origin intelligence** — Pacific SIDS facing existential displacement pressure from sea level rise, coastal erosion, and climate extremes
- **Destination intelligence** — Australian coastal and flood-zone communities facing their own managed retreat decisions

The platform is being featured at the **COPRRRA Inaugural Symposium** (Community of Practice on Relocation, Retreat, and Resilience in Australia), 2–3 September 2026, Brisbane. Boswell Haiosi (Founder & Technology Intelligence Strategist, TOFI) will present a 6-minute live demo.

**Strategic position:**  
> "The intelligence layer for the South Pacific Climate Mobility Action Plan 2026–2028"

**Organisational context:**
- Built by **DEQODE GROUP** (technology execution)
- Research arm: **The Orator Foundation Inc (TOFI)** — nonprofit status gives Earth Engine research/free-tier access
- Stakeholder engagement: IOM (International Organisation for Migration) + IGMF (International Governance and Migration Frameworks)

---

## 2. Platform Identity

| Attribute | Value |
|---|---|
| **Name** | DEQODE EARTH |
| **Tagline** | Asia-Pacific Climate Displacement Intelligence |
| **Sub-line** | Sovereign satellite intelligence for climate relocation and retreat planning |
| **Scope** | Asia-Pacific (MVP: Pacific SIDS + Australian zones; future: SE Asia, Indian Ocean) |
| **Audience** | Pacific island governments · Australian local government · Climate researchers · Policymakers · NGOs (IOM, IGMF) · COPRRRA members |

---

## 3. The COPRRRA Demo Flow

This is the UX north star. Every design decision must support this 6-minute sequence:

1. Open DEQODE EARTH on projector — full Asia-Pacific command center visible
2. *"Pacific nations are already facing existential displacement..."*  
   → Click **Tuvalu** in region tree → map flies to Tuvalu, intelligence panel opens showing SLR exposure, coastline loss rate, displacement pressure score
3. *"...and the destination communities face their own climate risk."*  
   → Click **Brisbane** → panel switches to flood zone data, 2022 event depth, managed retreat zones
4. *"This is what evidence-based, dignified relocation planning looks like."*  
   → Hit **Compare** → Tuvalu ↔ Brisbane side by side, animated displacement flow line connecting them, IOM DTM movement count

The region switch (Tuvalu → Brisbane) is the product. The compare view closes the demo.

---

## 4. Information Architecture

### Routes

| Route | Description | Status |
|---|---|---|
| `/` | Command Center — full Asia-Pacific map + Region Tree + Intelligence Panel | **Revamp** |
| `/region/[slug]` | Region Profile (replaces `/[country]`) — tabbed analysis view | **Refactor** |
| `/region/[slug]/[module]` | Deep analysis module (coastline, ocean, reef, land, flood, climate) | **Refactor** |
| `/compare/[origin]/[dest]` | Side-by-side origin vs destination intelligence | **New** |
| `/displacement` | Displacement Intelligence — IOM DTM data, Pacific→Australia flow map | **New** |
| `/cases/[slug]` | Case Studies (Grantham managed retreat, etc.) | **New** |
| `/admin` | Admin panel | Unchanged |
| `/login` | Auth | Unchanged |
| `/auth/*` | Auth callbacks | Unchanged |
| `/dashboard` | User dashboard redirect | Unchanged |

### Navigation model

Replace the current top-nav + card grid with a three-panel command center. Navigation happens through the Region Tree, not page links.

---

## 5. Asia-Pacific Scope — Region Hierarchy

### MVP Regions (build for September 2026)

| Region | Type | Data Source | Status |
|---|---|---|---|
| Niue | SIDS | GEE Sentinel-2 NDWI | Live |
| Palau | SIDS | GEE Sentinel-2 NDWI | Live |
| Fiji | SIDS | GEE Sentinel-2 NDWI | Live |
| Tuvalu | SIDS | GEE S2 + SRTM SLR | Activate |
| Kiribati | SIDS | GEE S2 + SRTM SLR | Activate |
| Marshall Islands | SIDS | GEE S2 + SRTM SLR | Activate |
| Vanuatu | SIDS | GEE S2 | Activate |
| Solomon Islands | SIDS | GEE S2 | Activate |
| **Brisbane** | Urban Flood | QLD Open Data · GloFAS · Deltares (Planetary Computer) | **Build** |
| **Grantham** | Managed Retreat | Historical QLD flood data · GEE Global Flood DB | **Build** |

### Region Tree Hierarchy (full Asia-Pacific scope)

```
ASIA-PACIFIC
├── Pacific Islands
│   ├── Polynesia      Niue ● · Tuvalu ● · Samoa ○ · Tonga ○
│   ├── Melanesia      Fiji ● · Vanuatu ● · Solomon Islands ● · PNG ○
│   └── Micronesia     Palau ● · Kiribati ● · Marshall Islands ● · FSM ○
│
├── Southeast Asia                                          [coming soon]
│   └── Philippines · Indonesia · Vietnam · Bangladesh · Myanmar
│
├── Australia & NZ
│   ├── QLD Flood Zones    Brisbane ● · Grantham ●
│   └── Coastal Risk       Gold Coast ○ · Cairns ○ · Darwin ○
│
└── Indian Ocean                                            [coming soon]
    └── Maldives · Sri Lanka
```

`●` = Live or building for MVP  
`○` = Coming soon (greyed out in UI, visible as roadmap)

### Adding new regions

Per the pipeline architecture (`config.py`), adding any Asia-Pacific region requires a single entry in the `REGIONS` dict. Zero additional code changes. The pipeline, API, and risk scoring engine pick it up automatically.

---

## 6. UI Design

### Design Parameters

| Parameter | Value | Effect |
|---|---|---|
| `DESIGN_VARIANCE` | 9 | High asymmetry — command center, not corporate dashboard |
| `MOTION_INTENSITY` | 7 | Meaningful animation — map fly-to, panel slides, data counters |
| `VISUAL_DENSITY` | 8 | Data-dense — risk scores, metrics, module tabs, status strip |

### Aesthetic Direction: "Pacific Command, Human Scale"

Authoritative and data-rich without being cold. The audience includes government ministers (need authority), researchers (need data credibility), and community advocates (need human dignity). It should feel like what Palantir would look like if it was designed for the Pacific with humanity.

### Typography

| Role | Font | Rationale |
|---|---|---|
| Display / Labels | **Syne** | Geometric, editorial, used by research institutions. Authority without corporate stiffness. Exceptional at large map labels. |
| Body / UI | **Source Sans 3** | Open-source, designed for legibility in dense information environments. Researchers read it comfortably for long periods. |
| Data / Mono | **JetBrains Mono** | Keep — already in brand. Used for coordinates, metrics, timestamps. |

### Color System (OKLCH)

```css
/* Surfaces */
--ocean:           oklch(11% 0.022 222)   /* #0D1B2A — deep base */
--surface:         oklch(16% 0.026 220)   /* panels */
--surface-raised:  oklch(21% 0.028 218)   /* cards */
--surface-peak:    oklch(26% 0.030 216)   /* hover states */
--border:          oklch(28% 0.025 220)   /* borders */
--border-subtle:   oklch(22% 0.022 220)   /* subtle dividers */

/* Text */
--text:            oklch(94% 0.008 220)   /* primary */
--text-mid:        oklch(65% 0.012 220)   /* secondary */
--text-dim:        oklch(42% 0.010 220)   /* muted */

/* Signals — existing brand extended */
--teal:            oklch(72% 0.13 196)    /* #4CB9C0 — operational / SIDS */
--gold:            oklch(73% 0.12 72)     /* #D4A55A — warnings */
--coral:           oklch(60% 0.17 22)     /* #E05B4B — critical risk */
--sky:             oklch(63% 0.13 248)    /* #3B7DD8 — information */

/* New — displacement narrative */
--migration:       oklch(68% 0.14 295)    /* purple-blue: flow lines SIDS→AUS */
--retreat:         oklch(70% 0.11 45)     /* warm amber: managed retreat zones */
```

### Region Type Badges

| Type | Color Token | Label |
|---|---|---|
| Pacific SIDS | `--teal` | `SIDS` |
| Urban Flood Zone | `--gold` | `FLOOD ZONE` |
| Managed Retreat | `--retreat` | `MANAGED RETREAT` |
| Case Study | `--sky` | `CASE STUDY` |
| Coming Soon | `--text-dim` | `COMING SOON` |

---

## 7. Layout — Three-Panel Command Center

```
┌──────────────────────────────────────────────────────────────────┐
│ DEQODE EARTH · ASIA-PACIFIC CLIMATE DISPLACEMENT INTELLIGENCE    │  48px command bar
│                                              [region search] [⚙] │
├─────────────────────╱────────────────────────────────────────────┤
│                    ╱  ← coastline clip-path (irregular edge)     │
│  REGION TREE      ╱                                              │
│  ──────────────  ╱        ASIA-PACIFIC MAP                       │
│  ▼ Pacific SIDS ╱         Leaflet — dark terrain tiles           │
│    Tuvalu  ● CR╱          default view: full Asia-Pacific        │
│    Niue    ● HI           center: 10°N 145°E zoom 4              │
│    Palau   ● CR                                                   │
│    Fiji    ● HI           [animated dashed lines:                │
│    Kiribati● CR            SIDS → Brisbane displacement flows]   │
│  ──────────────                                                   │
│  ▼ Australia                          ┌───────────────────────┐  │
│    Brisbane● HI                       │  INTELLIGENCE PANEL   │  │
│    Grantham● CS                       │  ─────────────────    │  │
│  ──────────────                       │  TUVALU · SIDS        │  │
│  ○ SE Asia  soon                      │  Risk: CRITICAL 87    │  │
│  ○ Ind. Ocean soon                    │  ─────────────────    │  │
│  ──────────────                       │  [Overview][Coastline]│  │
│  [+ Add Region]                       │  [Climate][Displace.] │  │
│                                       └───────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  S2 ACTIVE · 10 REGIONS · UPDATED 8 MIN AGO · COPRRRA DEMO MODE  │  32px status strip
└──────────────────────────────────────────────────────────────────┘
```

**Panel dimensions:**
- Command bar: 48px fixed top
- Region Tree: 240px, collapsible to 48px icon rail
- Intelligence Panel: 360px, slides in from right on region select
- Status strip: 32px fixed bottom

**The grid-breaking element:** Left panel right edge uses clip-path tracing a Pacific coastline silhouette — 4–5px of irregular variation instead of a straight vertical line. Subtle, memorable, contextually specific.

---

## 8. Compare View (`/compare/[origin]/[dest]`)

The COPRRRA demo centrepiece. Accessible via button in Intelligence Panel and direct URL.

```
┌────────────────────────────────┬───────────────────────────────┐
│  TUVALU · ORIGIN · SIDS        │  BRISBANE · DESTINATION       │
│  Risk: CRITICAL  87/100        │  Risk: HIGH  64/100           │
│  ──────────────────────        │  ──────────────────────       │
│  SLR Exposure:    8,400 ha     │  Flood Zone (1%): 24,300 ha   │
│  Coastline Loss: −2.1m/yr      │  2022 Event Depth: avg 1.4m   │
│  Displacement:    HIGH         │  Absorption Capacity: 43/100  │
│  Population:      11,000       │  Pacific Community: 18,400+   │
│  IOM Events:      6            │  Managed Retreat Zones: 12    │
│                                │                               │
│  [FULL ANALYSIS →]             │  [FULL ANALYSIS →]            │
└─────────────────┬──────────────┴───────────────┬───────────────┘
                  │  IOM DTM: 847 documented movements
                  │  ──────────────────────────────────
                  └── [VIEW DISPLACEMENT MAP]
```

**Data provenance badge:** "IOM DTM verified" displayed on displacement figures — signals credibility to researchers.

---

## 9. Displacement Intelligence View (`/displacement`)

- Full Asia-Pacific map with animated flow lines (SIDS → Australian communities)
- IOM DTM data: documented displacement events by country
- Timeline scrubber: replay displacement events over time
- Filter by driver: sea level rise / flood / cyclone / storm / drought

---

## 10. Grantham Case Study (`/cases/grantham`)

Grantham, QLD — relocated after 2011 floods. Australia's most significant community managed retreat.

Content:
- Pre/post satellite imagery (GEE Global Flood Database)
- Timeline of the relocation decision and execution
- Key metrics: households relocated, timeline, cost, outcome
- Lessons applied to SIDS context

This is the field trip destination on Day 2 of COPRRRA. It must be live by 3 September.

---

## 11. Key New Components

| Component | Description |
|---|---|
| `RegionTree` | Grouped hierarchy (sub-region → country), live/pending status, risk badges, coastline clip-path edge, collapsible |
| `IntelligencePanel` | 360px right panel, slides in on region select, module tabs, animated risk score HUD |
| `RiskScoreHUD` | Animated composite score counter (flood + SLR + displacement + climate), risk tier badge |
| `CompareView` | Split-screen origin vs destination, displacement flow stat, IOM badge |
| `DisplacementFlow` | Animated dashed Leaflet polylines connecting SIDS to Australian zones — `--migration` color |
| `CaseStudyCard` | Historical event data, timeline, satellite imagery before/after |
| `RegionTypeBadge` | SIDS / FLOOD ZONE / MANAGED RETREAT / CASE STUDY / COMING SOON |
| `StatusStrip` | Fixed 32px bottom: satellite status, data freshness, region count, demo mode indicator |
| `MapCanvas` | Full-viewport Leaflet map, default Asia-Pacific view, fly-to on region select |

### Components preserved from existing codebase

| Existing | Becomes |
|---|---|
| `TopNav` | Replaced by 48px Command Bar (simplified) |
| `CoastlineModule` | Tab inside `IntelligencePanel` |
| `CoastlineMap` | Embedded within `IntelligencePanel` coastline tab |
| `MetricCards` | Adapted as `RiskScoreHUD` sub-components |
| Auth system | Unchanged |
| Admin panel | Unchanged |
| All API routes | Unchanged |

### Routes refactored

| Old | New |
|---|---|
| `/[country]` | `/region/[slug]` |
| `/[country]/coastline` | `/region/[slug]/coastline` (then becomes IntelligencePanel tab) |

---

## 12. Data Pipeline (from pipeline spec doc)

### New data sources for Brisbane + Grantham

| Source | Data | Access |
|---|---|---|
| Queensland Open Data Portal | Flood awareness zones, 2022 flood extent, overland flow, floodplain overlay | Free, GeoJSON API |
| Brisbane City Council Open Data | Creek/river/storm tide 1% AEP zones | Free, GeoJSON |
| Copernicus EMS / GloFAS | Flood forecasts, historical flood extent (Sentinel-1 SAR) | Free, auth required |
| Microsoft Planetary Computer | Deltares Global Flood Maps (coastal + riverine, 10/50/100yr return periods) | Free data access |
| GEE: Global Flood Database v1 | Historical flood events 2000–2018 | Free (TOFI research access) |
| GEE: JRC Global River Flood Hazard Maps v2.1 | Return period flood modelling | Free |
| IOM DTM API | Pacific climate displacement data | Free (stakeholder relationship) |
| NASA NEX-GDDP-CMIP6 | Climate projections SSP585 2040–2060 | Free (via GEE) |

### Backend architecture

```
Data Sources → Python ingestion scripts (Cloud Run scheduled)
             → BigQuery (storage: flood_events, displacement_data, climate_projections, risk_scores)
             → REST API (Cloud Run Flask)
             → Next.js frontend (Vercel)
```

Full schema and ingestion code specified in `deqode-earth/docs/pipeline-spec.md`.

Total infrastructure cost at MVP: **$0** (GCP free tier + TOFI Earth Engine research access)

---

## 13. Animation Spec

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Region select → map fly-to | Leaflet `flyTo()` | 1200ms | Leaflet default |
| Intelligence panel open | `translateX(100% → 0)` + `opacity(0 → 1)` | 300ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Risk score counter | Number count-up | 600ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Region tree stagger | `translateY(12px → 0)` + `opacity(0 → 1)` | 40ms stagger per item | ease-out |
| Displacement flow lines | Dash offset animation (CSS) | 2s loop | linear |
| Compare view entry | Both panels slide in from sides | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Page load | Command bar → tree → map → status strip | 600ms total stagger | ease-out |

All animations: `transform` and `opacity` only. `prefers-reduced-motion` respected.

---

## 14. Build Sequence — 15 Weeks to COPRRRA

| Week | Milestone | Priority |
|---|---|---|
| 1–2 | Command Center layout (homepage revamp) — MapCanvas + CommandBar + StatusStrip | P0 |
| 3–4 | RegionTree component + Intelligence Panel + region route refactor (`/region/[slug]`) | P0 |
| 5–6 | Brisbane flood zone data pipeline — QLD Open Data + GloFAS ingestion | P0 |
| 7–8 | Grantham case study region + Compare View (`/compare/[a]/[b]`) | P0 |
| 9–10 | Activate all 8 SIDS (`isLive: true`) + coastline algorithm fix (Option B: MNDWI + Otsu + HYCOM + dry-season) | P1 |
| 11–12 | Displacement Intelligence view + IOM DTM data integration | P1 |
| 13 | BigQuery + Cloud Run backend migration (removes Vercel Python ceiling) | P1 |
| 14 | Syne + Source Sans 3 typography, animation polish, DisplacementFlow map lines | P2 |
| 15 | Demo mode, stress test, final Vercel deploy, rehearse 6-minute presentation | P0 |

### What ships at COPRRRA (non-negotiable)

- Command Center layout live
- Tuvalu (or Niue) + Brisbane + Grantham all live with real data
- Compare view working (`/compare/tuvalu/brisbane`)
- Sentinel-1 hero copy fixed (currently wrong — says "SAR Active")
- Auth working (already done)

### What can be coming-soon at COPRRRA

- SE Asia regions
- Indian Ocean regions
- Full IOM DTM displacement view
- Cloud Run migration (Vercel Python still works at demo scale)
- Agent ecosystem

---

## 15. Scientific Credibility (for researcher audience)

The coastline algorithm must be fixed before COPRRRA. Current numbers are physically implausible (Niue reporting 8% land change in 5 years — impossible).

**Option B implementation (recommended):**
- Replace NDWI → MNDWI (better for tropical coasts, reduces vegetation leakage)
- Add Otsu auto-threshold (eliminates arbitrary 0.1 cutoff)
- Add HYCOM tidal filter (removes tidal bias — currently the dominant signal)
- Use dry-season composites only (May–Oct for Niue, reduces cloud noise)
- Add connected-components minimum polygon (0.5 ha minimum, removes speckle)
- Vectorize output via `reduceToVectors()` (renders correctly at web zoom)

This matches DEA Coastlines and CoastSat methodology — defensible in a room of researchers.

**Data provenance badges** on all metrics: "GEE Sentinel-2", "IOM DTM verified", "JRC GloFAS", "QLD Open Data". These signal credibility to the COPRRRA audience.

---

## 16. Scope Declaration

> DEQODE EARTH's scope is the **Asia-Pacific region**. The MVP covers Pacific SIDS and Australian flood zones. Future builds will expand to Southeast Asia (Philippines, Indonesia, Vietnam, Bangladesh, Myanmar) and the Indian Ocean (Maldives, Sri Lanka). The platform architecture — `REGIONS` dict, ingestion pipeline, BigQuery schema, risk scoring engine, and regional UI — is designed from day one to accommodate any territory in the Asia-Pacific with a single config entry. No code changes required to add new regions.

---

*Spec written 2026-05-20 · DEQODE GROUP + TOFI · Ship target: 2 September 2026*
