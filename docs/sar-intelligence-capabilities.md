# SAR Intelligence Capabilities — AIR · LAND · SEA
## DEQODE EARTH Strategic Reference
### Prepared for: DEQODE Group — Pacific SIDS Intelligence Platform
### Date: 2026-04-13

---

## What is SAR

Synthetic Aperture Radar (SAR) is an active microwave sensor that transmits its own energy and captures the return signal — meaning it works day and night, through cloud cover, smoke, and rain. For Pacific island nations where cloud cover is near-permanent and cyclone conditions are frequent, SAR is uniquely valuable. Optical sensors (cameras) go blind in these conditions. SAR does not.

**Primary sensors available via Google Earth Engine:**
- **Sentinel-1 (ESA)** — C-band SAR, 5-20 m resolution, 6-12 day repeat, free
- **ALOS-2 PALSAR (JAXA)** — L-band SAR, 10-100 m resolution, penetrates vegetation canopy
- **Landsat (USGS/NASA)** — optical + thermal, 30 m, archive to 1972 (not SAR but complements it)
- **Sentinel-2 (ESA)** — optical multispectral, 10 m, complements SAR for reef/vegetation

---

## SEA Domain

| Capability | What SAR Detects | Pacific SIDS Application | Data Source | Confidence |
|---|---|---|---|---|
| **Vessel detection** | Ships >10 m on ocean surface | IUU fishing, dark vessel tracking, MPA enforcement | Sentinel-1 | High |
| **Dark vessel analysis** | Vessels with AIS transponders off (compare SAR detections vs AIS registry) | Illegal fishing in Niue, Palau, Tuvalu EEZs | Sentinel-1 + AIS feed | High |
| **Coastal erosion** | Land/water boundary change over time | Shoreline loss, infrastructure risk, climate finance evidence | Sentinel-1 | High |
| **Coastal accretion** | Sediment deposition, new land formation | Reef flat dynamics, island migration | Sentinel-1 | High |
| **Oil spill detection** | Smooth surface anomalies (Bragg scattering suppression) | Maritime incident response, pollution monitoring | Sentinel-1 | High |
| **Storm surge mapping** | Inundation extent post-cyclone | Disaster response, infrastructure damage assessment | Sentinel-1 | High |
| **Wave height / swell** | Ocean surface roughness fields | Coastal hazard warning, navigation safety | Sentinel-1 | Medium |
| **Wind field mapping** | Surface wind speed and direction | Cyclone tracking, fisheries safety, renewable energy siting | Sentinel-1 | High |
| **Sea ice extent** | Not applicable to Pacific tropics | N/A for Pacific SIDS | — | — |
| **Mangrove extent** | Vegetation/water boundary in coastal zones | Mangrove loss tracking, blue carbon accounting | Sentinel-1 + Sentinel-2 | High |
| **Coral reef shallow water** | Bathymetric contrast in shallow lagoons | Reef structure mapping (limited depth) | Sentinel-1 + Sentinel-2 | Medium |
| **Tsunami inundation** | Before/after coastal change post-event | Rapid damage assessment, insurance/aid triggering | Sentinel-1 | High |
| **Submarine landslide precursors** | Seafloor deformation (InSAR offshore) | Early warning for Pacific volcanic islands | Sentinel-1 InSAR | Low–Medium |

---

## LAND Domain

| Capability | What SAR Detects | Pacific SIDS Application | Data Source | Confidence |
|---|---|---|---|---|
| **Cyclone damage assessment** | Backscatter change post-event (damaged vegetation/structures) | Rapid post-cyclone response, aid targeting, insurance | Sentinel-1 | High |
| **Flood extent mapping** | Standing water (low backscatter) | Inundation mapping during/after cyclone or king tide | Sentinel-1 | High |
| **Land subsidence** | Ground deformation via InSAR (mm precision) | Atoll sinking, groundwater extraction, infrastructure risk | Sentinel-1 InSAR | High |
| **Deforestation** | Forest/non-forest classification change | Illegal logging (Solomon Islands, Vanuatu), land clearing | Sentinel-1 + ALOS PALSAR | High |
| **Agricultural monitoring** | Crop type classification, harvest cycles | Food security monitoring, drought impact | Sentinel-1 + Sentinel-2 | Medium |
| **Soil moisture** | Surface dielectric properties | Drought early warning, agricultural risk | Sentinel-1 | Medium |
| **Urban expansion** | High backscatter built environment growth | Infrastructure planning, population pressure | Sentinel-1 | High |
| **Volcanic ground deformation** | Surface displacement (InSAR) | Eruption precursor monitoring (Vanuatu — Ambrym, Yasur) | Sentinel-1 InSAR | High |
| **Landslide detection** | Terrain change, displacement | Post-event mapping, risk zone identification | Sentinel-1 | High |
| **Wildfire burn scar** | Post-fire backscatter change | Damage assessment, vegetation recovery tracking | Sentinel-1 + Sentinel-2 | High |
| **Infrastructure damage** | Building/road damage from SAR coherence loss | Post-disaster aid, reconstruction planning | Sentinel-1 | High |
| **Illegal mining** | Land surface disturbance, new clearings | Environmental enforcement, resource protection | Sentinel-1 | Medium |
| **Saltwater intrusion** | Soil/vegetation stress indicators | Freshwater security monitoring for atolls | Sentinel-1 + Sentinel-2 | Medium |
| **Land use change** | Multi-temporal classification change | Planning compliance, conservation monitoring | Sentinel-1 + Landsat archive | High |

---

## AIR Domain

| Capability | What SAR Detects | Pacific SIDS Application | Data Source | Confidence |
|---|---|---|---|---|
| **Cyclone intensity mapping** | Surface wind fields, eye wall structure | Track forecasting, pre-landfall preparation | Sentinel-1 | High |
| **Cyclone damage track** | Before/after land surface change along storm path | Damage corridor mapping, targeted response | Sentinel-1 | High |
| **Volcanic ash plume extent** | SAR penetrates ash (unlike optical sensors) | Aviation hazard, island evacuation planning (Vanuatu) | Sentinel-1 | Medium |
| **Atmospheric water vapour** | Signal delay in InSAR processing | Weather pattern analysis, climate modelling input | Sentinel-1 InSAR | Medium |
| **Dust / smoke transport** | SAR unaffected — reveals ground truth under smoke | Post-fire mapping when optical is obscured | Sentinel-1 | High |
| **Aircraft on ground** | Large stationary metal objects detectable | Airstrip monitoring, security (limited resolution) | Sentinel-1 | Low |
| **Rainfall estimation (indirect)** | Ocean surface roughness as wind/rain proxy | Rainfall proxy for remote atolls with no rain gauges | Sentinel-1 | Low–Medium |
| **Sea spray / salt deposition** | Coastal wind-driven spray patterns | Infrastructure corrosion risk mapping | Sentinel-1 | Low |

---

## Cross-Domain Capabilities (AIR + LAND + SEA combined)

| Capability | Domains | Application |
|---|---|---|
| **Cyclone lifecycle tracking** | Air → Sea → Land | Track → landfall → damage: full event intelligence in one platform |
| **Climate finance evidence packages** | All three | Compile SAR-verified erosion + flood + damage data into Santiago Network / UNFCCC submissions |
| **Disaster response briefings** | Sea + Land + Air | Automated before/after reports for government EOCs within 12 hours of Sentinel-1 pass |
| **EEZ sovereignty monitoring** | Sea + Air | Vessel detection + wind/weather context for fisheries enforcement decisions |
| **Long-term change atlas** | All three | Landsat 1984 → Sentinel 2025 = 40-year change record per country |
| **Carbon accounting** | Land + Sea | Mangrove + forest cover change for blue/green carbon credit applications |

---

## Priority Modules for Pacific SIDS — Sequenced by Value

| Phase | Module | Primary Beneficiary | Revenue Model |
|---|---|---|---|
| **Now** | Coastline Intelligence (SAR erosion/accretion) | Coastal departments, climate finance teams | Platform licence |
| **Phase 2** | Ocean Intelligence (IUU dark vessel detection) | Fisheries departments, MPA managers (e.g. NOW) | Platform licence + enforcement data fee |
| **Phase 2** | Cyclone Damage Assessment | National disaster management offices | Emergency response contract |
| **Phase 3** | Reef Intelligence (Sentinel-2 NDWI + SAR) | Environment departments, tourism authorities | Platform licence |
| **Phase 3** | Land Intelligence (deforestation, flood, subsidence) | Land departments, infrastructure planners | Platform licence |
| **Phase 4** | InSAR Subsidence Monitoring | Atoll governments (Tuvalu, Kiribati, Marshall Islands) | Specialised contract |
| **Phase 4** | Volcanic Monitoring (InSAR deformation) | Vanuatu NDMO, aviation authority | Emergency/safety contract |
| **Phase 5** | 40-Year Change Atlas (Landsat archive) | All 8 SIDS — government + international bodies | Premium report product |

---

## Why NOW (Niue Ocean Wide) is the ideal first partner

| NOW Program | DEQODE EARTH Module | Value |
|---|---|---|
| Niue Moana Mahu MPA enforcement | Ocean Intelligence — IUU detection | Monitor ~390,000 km² EEZ for dark vessels automatically |
| Coastal habitat monitoring | Coastline Intelligence | Replace manual field surveys with continuous satellite data |
| Climate adaptation reporting | All modules | Satellite-verified evidence packages for UNFCCC, GCF, Santiago Network |
| Fisheries management | Ocean Intelligence | Correlate fishing effort with EEZ zones, seasonal patterns |
| Coral reef health | Reef Intelligence (Phase 3) | Bleaching risk from Sentinel-2 — feeds directly into MPA decisions |

**Proposal trigger:** Once MVP is confirmed working (data + map), approach NOW with a 12-month pilot proposal — free access in exchange for co-development input and a published case study. Case study becomes the primary evidence document for all 8 SIDS CFP submissions.

---

## Competitive position

No other platform currently offers:
1. Multi-domain (Air + Land + Sea) SAR intelligence in a single interface
2. Built specifically for Pacific SIDS governance needs
3. Google Earth Engine 40-year archive + real-time Sentinel analysis
4. Government-ready PDF report outputs
5. Santiago Network / climate finance alignment built in

The closest competitors (Sentinel Hub, Planet, Maxar) are general-purpose commercial platforms with no Pacific SIDS focus and no government workflow integration.

---

*Document prepared by DEQODE Group — internal strategic reference*
*For proposal development use only*
