# DEQODE EARTH — Niue Sovereign Intelligence Platform
## Design Specification
**Date:** 2026-04-12  
**Status:** Draft — pending Boswell review  
**Author:** DEQODE Group / Claude Sonnet

---

## 1. What We Are Building

A sovereign geospatial intelligence platform for the Pacific, built on free ESA Copernicus satellite data (Sentinel-1 SAR + Sentinel-2 Optical) processed via Google Earth Engine.

Niue is the live case study. All eight Pacific Small Island Developing States (SIDS) are present in the platform from launch. Other nations are added over time.

This is not a research tool. It is a government intelligence product — designed to be used by ministers, technical advisors, and international climate finance reviewers.

---

## 2. Core Purpose

Give Pacific island governments sovereign control of their own geospatial intelligence — coastal erosion, illegal fishing, reef health, and land cover — at zero data cost, using free satellite infrastructure nobody has previously made accessible to them.

**Primary pitch context:** Santiago Network technical assistance CFPs  
- Fiji — CFP/SN/24039/2026/FJI/004 — deadline 4 May 2026  
- Palau — CFP/SN/24039/2026/PLW/007 — deadline 15 May 2026  

---

## 3. Platform Structure — Country Dashboard

**Navigation model:** Country-first, not module-first.

The user selects a country. The platform renders a complete sovereign intelligence dashboard for that nation — all four modules visible together as one national brief. This is the "Country Dashboard" pattern.

### Why this over tabs or a regional map
- Feels like a real government intelligence product, not a data tool
- One page = one nation = one downloadable report
- Santiago Network reviewers receive a complete brief, not a link to a dashboard they have to navigate
- Fastest path to demo-ready for the May deadlines
- Regional threat map can be added in v2 once the data pipeline is proven

---

## 4. The Four Intelligence Modules

Each module runs against the selected country's AOI (Area of Interest) using the same Sentinel-1/2 pipeline.

### 4.1 Coastline — Land Loss to Sea
**Status:** Built (proof of concept in Streamlit)  
**What it measures:** Coastal erosion and accretion — hectares of land lost or gained between two years  
**Data:** Sentinel-1 SAR (primary), Sentinel-2 NDWI optical (fallback)  
**Output:** Land lost (ha), land gained (ha), net change (ha), map overlay, trend narrative  

### 4.2 Ocean — Dark Vessel Detection
**What it measures:** Vessel presence in the national EEZ regardless of AIS transponder status. Cross-references SAR detections against AIS data to identify dark vessels — likely IUU fishing activity.  
**Data:** Sentinel-1 SAR (vessel backscatter detection)  
**Output:** Vessel count detected, dark vessel count (no AIS match), hotspot map, economic risk estimate  
**Limitation to surface in UI:** Sentinel-1 revisit is 6–12 days — not real-time. Small vessels (<15m) may be below detection threshold.  

### 4.3 Reef — Coral Health and Sediment
**What it measures:** Coral reef extent, bleaching indicators, and sediment load from coastal erosion  
**Data:** Sentinel-2 optical (water-leaving reflectance, turbidity index)  
**Output:** Reef health index, bleaching risk zone map, sediment plume extent  
**Note:** Sentinel-2 optical is cloud-dependent — composites used to reduce cloud interference  

### 4.4 Land — Forest Cover and Storm Damage
**What it measures:** Native forest cover change, land clearing, and post-storm damage extent  
**Data:** Sentinel-1 SAR (penetrates cloud — critical for post-cyclone assessment), Sentinel-2 optical  
**Output:** Forest cover (ha), change from baseline, cleared area, storm damage extent if event detected  

---

## 5. Countries in Platform at Launch

| Country | Status | EEZ km² | Climate Risk |
|---|---|---|---|
| 🇳🇺 Niue | Live — full case study | ~390,000 | HIGH |
| 🇵🇼 Palau | Pre-configured | ~600,000 | CRITICAL |
| 🇫🇯 Fiji | Pre-configured | ~1,290,000 | HIGH |
| 🇹🇻 Tuvalu | Pre-configured | ~900,000 | CRITICAL |
| 🇰🇮 Kiribati | Pre-configured | ~3,440,000 | CRITICAL |
| 🇲🇭 Marshall Islands | Pre-configured | ~2,000,000 | CRITICAL |
| 🇻🇺 Vanuatu | Pre-configured | ~680,000 | HIGH |
| 🇸🇧 Solomon Islands | Pre-configured | ~1,590,000 | HIGH |

**"Pre-configured" means:** AOI bounding box is defined, all four modules run against the country on demand, and metric outputs are displayed. Country-specific narrative (case study text, Santiago Network framing) is Niue-only at launch — other countries show generic findings language. Narrative content for Palau and Fiji to be added before their CFP deadlines.

All eight AOIs are pre-defined. Analysis runs on demand for any country. Niue has the deepest narrative and case study content.

---

## 6. User Experience — Layered View

Two audiences, one platform, one URL.

### Executive layer (top)
For ministers and senior officials. Plain English. No jargon.  
- Key finding in one sentence: "Niue lost 12.4 hectares of coastline between 2020 and 2024."  
- Risk level: HIGH / CRITICAL / MODERATE  
- Three metric cards (same pattern as existing app)  
- Download report button (prominent)  

### Technical layer (below, collapsed by default)
For advisors, analysts, and Santiago Network technical reviewers.  
- Methodology summary  
- Sensor used, scene count, resolution  
- Raw numbers and uncertainty notes  
- Data specifications table  
- Map with analysis overlays  

The technical layer expands on click — "View technical details" toggle. Default state is collapsed so the minister sees a clean brief.

---

## 7. Report Output

Two formats generated from the same analysis run:

### PDF Report
- Branded DEQODE EARTH document
- DEQODE Group logo, country flag, date
- Executive summary (plain English findings)
- Four module results with visualisations
- Methodology section
- Signature block: "Prepared by DEQODE Group under technical assistance mandate"
- Suitable for direct attachment to Santiago Network CFP submissions

### Plain Text Brief (.txt)
- Same content, no formatting
- Fast fallback for email attachments
- Already built in existing codebase

Both generated on demand after analysis runs.

---

## 8. Access Model

| Layer | Access |
|---|---|
| View platform and existing results | Public — no login required |
| Run a new analysis | Requires login |
| Download reports | Requires login |
| Admin / manage countries | DEQODE internal only |

**Rationale:** Public view makes the platform discoverable and shareable. Gated analysis controls GEE compute costs and prevents abuse. Login is simple — email + password, no OAuth complexity at this stage.

---

## 9. IP and Commercial Model

### Phase 1 — Platform Licence (launch)
DEQODE Group owns:
- The platform codebase and pipeline
- The processing methodology
- The intelligence brief templates
- The historical analysis archive (grows in value over time)

Government of Niue receives:
- A sovereign licence to use the platform
- Full control and ownership of their own data outputs
- The right to share their analysis results freely

**Revenue model:** Annual platform licence fee (AUD). Per-country pricing. First licence: Government of Niue. Each additional Pacific nation is a new licence.

### Phase 2 — Joint Venture pathway (year 2+)
Once the platform proves value and trust is established, offer Niue co-ownership of the Pacific regional platform. Niue brings political legitimacy and Pacific relationships. DEQODE brings technical infrastructure. Revenue from new Pacific nation licences is split.

This positions Niue as a regional co-champion — not just a customer — and opens doors across the Pacific that no external organisation can access.

---

## 10. Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Frontend | Next.js (App Router) | Replace Streamlit — production-grade |
| Satellite processing | Google Earth Engine | Same pipeline — upgrade to paid tier |
| Map display | Mapbox GL JS | Replace Folium — proper tile handling, satellite basemap |
| PDF generation | Puppeteer (via API route) | Server-side PDF from HTML template — note Vercel function size limit applies |
| Auth | Supabase Auth | Simple email/password — consistent with Supabase DB choice |
| Hosting | Vercel | Aligned with DEQODE stack |
| Database | Supabase (Postgres) | Store analysis results, user accounts |
| GEE credentials | Service account (existing) | Already working |

**Note on Streamlit:** The existing Streamlit POC stays as-is — it proved the concept. The production platform is a full rebuild. The GEE analysis pipeline (the core logic in `run_analysis`) is reused directly, wrapped in a proper API layer.

---

## 11. What Is Not In Scope (v1)

- Real-time vessel tracking (Sentinel-1 revisit is 6–12 days — not real-time)
- Custom AOI drawing (users can't draw their own region — pre-defined per country)
- Historical trend charts (two-point comparison only — time series is v2)
- Mobile app
- Regional threat map (v2)
- Automated alerts / notifications (v2)
- More than 8 countries at launch

---

## 12. Success Criteria

The platform is done when:
1. Government of Niue can log in and run all four modules for their country
2. The output is a branded PDF suitable for Santiago Network submission
3. All eight Pacific SIDS appear in the country selector
4. The platform is hosted on a stable production URL (not Streamlit Community Cloud)
5. DEQODE holds clear IP ownership with a licence agreement ready to sign

---

## 13. Build Phases (high level)

| Phase | Scope | Priority |
|---|---|---|
| 1 | Production frontend shell — Next.js, auth, country selector | High |
| 2 | Coastline module — port existing GEE pipeline to API route | High |
| 3 | Ocean module — dark vessel detection | High |
| 4 | PDF report generation | High |
| 5 | Reef module | Medium |
| 6 | Land module | Medium |
| 7 | Layered UX (executive + technical view) | Medium |
| 8 | All 8 SIDS pre-configured and tested | High |

Phases 1–4 + 8 are the minimum viable product for the Santiago Network deadlines.
