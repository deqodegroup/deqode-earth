# DEQODE EARTH — Strategic Positioning
## Competitive Landscape · Tech Trust Assessment · Santiago Network TAP Strategy
### Date: 2026-04-13

---

## Platform Trustworthiness

### The data is solid

Sentinel-1 SAR is ESA's operational mission used by governments, universities, and commercial EO companies globally. The coastal erosion methodology (SAR backscatter thresholding) is peer-reviewed and established. Google Earth Engine hosts the complete archive and is the gold standard for satellite data analysis. This is the same data stack that serious EO companies charge six figures to access.

### Honest limitations to disclose to partners

| Limitation | Reality | Impact |
|---|---|---|
| 10 m resolution | Changes under 10 m undetectable | Fine for trend analysis, not mm-precision engineering |
| 6–12 day revisit | Not real-time | Cyclone event won't be imaged immediately |
| Fixed -15 dB threshold | Works for most Pacific coastlines | Calm lagoons vs exposed coasts may need per-location calibration |
| IUU detection | SAR sees vessels — not motive | Requires AIS cross-referencing to confirm fishing vs transit |
| Heavy rain | Can affect signal quality | Rare but disclose for completeness |

### Bottom line

Most Pacific SIDS currently have zero systematic satellite monitoring. They rely on periodic consultant studies, SPREP reports, and anecdotal observation. Even imperfect satellite data delivered consistently and affordably is transformatively better than what these governments currently have. The platform doesn't need to be perfect — it needs to be available, affordable, and interpretable by non-technical staff.

---

## Competitive Landscape

### What exists in Asia-Pacific

| Platform | What it does | Why it's not the same |
|---|---|---|
| **Global Fishing Watch** | IUU vessel detection — free to governments | Ocean only. No coastal, reef, land, or report outputs. Already used in Pacific — complement, not compete |
| **Digital Earth Pacific (SPC)** | Open data cube — Sentinel + Landsat for Pacific | GIS infrastructure requiring technical expertise. Data layer not a government intelligence tool |
| **NASA SERVIR** | Satellite environmental intelligence for developing regions | Requires in-country technical capacity. Not a managed platform |
| **SPREP** | Pacific environmental policy + data aggregation | Policy body, not a satellite platform. Potential partner |
| **Planet / Maxar** | High-res commercial imagery | Expensive, no Pacific SIDS workflow, no government reporting |
| **Copernicus EMS** | Crisis mapping for emergencies | Reactive not systematic. EU-focused |
| **FFA (Forum Fisheries Agency)** | EEZ fisheries monitoring via VMS transponders | Transponder-dependent — cannot detect dark vessels |
| **SPC Geospatial** | Regional GIS and statistics | Technical GIS service, not an intelligence platform |

### The gap DEQODE EARTH fills — nobody else does this

1. **Multi-domain in one platform** — coastal + ocean + reef + land intelligence
2. **Built for non-technical users** — government departments and NGOs, not GIS specialists
3. **Climate finance outputs baked in** — PDF reports ready for Santiago Network / UNFCCC / GCF submissions
4. **Pacific SIDS specific** — not a generic global tool awkwardly adapted
5. **40-year Landsat archive** — historical change context no competitor matches
6. **Operational not consultancy** — continuous monitoring not periodic studies

---

## Santiago Network TAP Strategy

### What the Santiago Network actually is

The Santiago Network is a UN facilitation mechanism under the UNFCCC. It connects SIDS and developing nations that need climate adaptation technical assistance with providers who can deliver it. It is NOT just a grant/CFP mechanism — it maintains a formal registry of Technical Assistance Providers (TAPs).

### The strategic move: Register DEQODE Group as a TAP

TAP registration opens access to all 58 SIDS globally — not just Pacific. Caribbean, Indian Ocean, West Africa, Southeast Asia. Same coastlines, same EEZ enforcement problems, same climate finance needs.

**What TAP registration means in practice:**
- Any SIDS government can formally request DEQODE EARTH as their technical assistance provider
- The request is funded through the Santiago Network mechanism — government pays nothing directly
- DEQODE is embedded in the UN climate architecture, not just selling to it
- Every CFP win becomes a reference for the next country

### Registration pathway

1. Complete MVP + confirm data working on Niue
2. Publish Niue case study (with NOW if possible)
3. Submit TAP registration to Santiago Network Secretariat
4. Nominate service categories: Coastal monitoring, Ocean intelligence, Climate data analysis, Capacity building
5. List under both Technology Provider and Technical Assistance categories

### TAP registration contact
- Santiago Network Secretariat: members@santiago-network.org
- Same address for CFP submissions — establish the relationship through the Fiji/Palau CFPs first

---

## NOW — Niue Ocean Wide — First Partner Strategy

### Why NOW is the ideal first partner

| NOW Program | DEQODE EARTH Module | Value |
|---|---|---|
| Niue Moana Mahu MPA (~127,000 km²) | Ocean Intelligence — IUU detection | Monitor ~390,000 km² EEZ for dark vessels automatically |
| Coastal habitat monitoring | Coastline Intelligence | Replace manual surveys with continuous satellite data |
| Climate adaptation reporting | All modules | Satellite-verified evidence for UNFCCC, GCF, Santiago submissions |
| Fisheries management | Ocean Intelligence | Correlate fishing effort with EEZ zones, seasonal patterns |
| Coral reef health | Reef Intelligence (Phase 3) | Bleaching risk feeding directly into MPA decisions |

### Proposed approach

Once MVP is confirmed working: approach NOW with a 12-month pilot — **free access in exchange for co-development input and a published case study.**

The case study becomes the primary evidence document for all 8 SIDS CFP submissions and the cornerstone of the TAP registration application.

---

## DEQODE EARTH — Standalone Product Position (confirmed 2026-04-14)

### The core principle: Santiago is a channel, not an integration

DEQODE EARTH is a standalone sovereign intelligence platform. Santiago Network is a client acquisition and funding channel — not a system to integrate with.

**Why standalone is the right architecture:**

- **IP stays with DEQODE** — integrating into UN data infrastructure means negotiating IP, data governance, and usage rights with a multilateral bureaucracy. Standalone means DEQODE owns the platform, the methodology, and the outputs entirely
- **The licensing model requires it** — governments pay DEQODE for access to the platform. If Santiago "provides" the tool, the payment relationship collapses. The correct flow is: Santiago funds the government → government pays DEQODE for a platform licence
- **Data sovereignty is a government requirement** — Pacific SIDS will not accept their coastal vulnerability, erosion rates, or EEZ vessel activity sitting in shared UN infrastructure. This data is national security adjacent. A government knowing their coastline is retreating at 3.2m/year has implications for land rights, sovereignty claims, insurance, and climate negotiations — they control that narrative
- **Siloed by design** — each government's data is gated behind their own Supabase auth instance, not pooled or visible to other nations. This is a feature, not a limitation. The pitch: *"Your intelligence is sovereign. Only your department sees it."*

### The clean commercial model

```
Santiago Network funds the mandate
        ↓
Government signs DEQODE platform licence
        ↓
DEQODE EARTH runs as sovereign tool for that government
        ↓
Data never leaves their context
        ↓
DEQODE retains full platform IP
```

### On future Santiago data integration

If a government ever requests data sharing with Santiago Network reporting systems, this is handled as a **separate integration feature** scoped and priced at the licence level — not baked into the core platform. The government controls what gets shared and when. DEQODE builds the export/reporting bridge on request.

### Agent infrastructure note (confirmed 2026-04-14)

AI agents (scheduled analysis, threshold alerts, auto-report distribution, EOI drafting) are high-value additions to DEQODE EARTH as a standalone tool. They do not require Santiago integration — they operate entirely within each government's siloed instance. The agent layer reinforces the sovereign data model.

---

## DEQODE Group — Two Platform Strategy

| Platform | Domain | Status | Revenue model |
|---|---|---|---|
| **TOP** | AI productivity platform | In development | SaaS subscription |
| **DEQODE EARTH** | Pacific geospatial intelligence | MVP in progress | Government licence + Santiago TAP |

These are complementary, not competing. TOP serves commercial/creative clients. DEQODE EARTH serves governments and NGOs. Different markets, different revenue models, same underlying DEQODE technical capability.

Combined, they position DEQODE Group as both a commercial AI studio and a sovereign intelligence provider — a rare and defensible dual position.

---

*Document prepared by DEQODE Group — internal strategic reference*
*Classification: Internal — not for distribution*
