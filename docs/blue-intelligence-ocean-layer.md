# Blue Intelligence — Ocean Layer

**Confirmed:** 2026-04-14  
**Status:** Phase 3 roadmap — not yet built

---

## What it is

A new analysis vertical within DEQODE EARTH for marine migration and habitat intelligence. Sits alongside the coastline module as a named product capability.

**Route:** `/[country]/ocean`

---

## Why it fits

- Niue Moana Mahu MPA is ~127,000 km² — one of the world's largest — currently unmonitored
- Niue's full EEZ is ~390,000 km²
- NOW (Niue Ocean Wide) is already the target first partner
- All data sources are already accessible via Google Earth Engine — no new infrastructure needed

---

## GEE Data Sources

| Dataset | Role |
|---|---|
| MODIS SST (MOD11A1) | Thermal migration corridor mapping |
| MODIS Chlorophyll-a | Prey/krill feeding hotspot concentration |
| Sentinel-1 SAR | Whale surface aggregation detection (calm sea conditions) |
| GEBCO Bathymetry | Depth preference corridors by species |

External (API, not GEE):
- OBIS / GBIF — historical species occurrence records

---

## Output Metrics

- Thermal corridor probability heatmap
- Feeding hotspot score by grid cell
- High-risk vessel conflict zones (AIS crossover)
- Species likely present by season and sea state

---

## Target Buyers

| Segment | Use case |
|---|---|
| Conservation NGOs (WWF, WCS, Ocean Alliance) | Migration monitoring, MPA management |
| Shipping companies | Whale strike liability, IMO compliance |
| Pacific Island governments | MPA intelligence — Niue is first |
| Fisheries management bodies | Bycatch reduction, seasonal closures |

---

## NOW Pitch Line

> "We can show you where humpbacks are likely transiting your MPA right now, and which vessel tracks are cutting through."

---

## Build Notes

- Coastline analysis module is the template — same pattern: GEE analysis → Cloud Run → metric cards + heatmap overlay
- No new infrastructure required beyond what Phase 2 Cloud Run migration delivers
- Layer switcher (Phase 2) should be designed to accommodate Ocean layer from the start
