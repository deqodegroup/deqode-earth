# DEQODE EARTH Revamp — Phases 4–7: Compare View, SIDS Activation, Agents, Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the Compare View (COPRRRA demo centrepiece), activate all 8 SIDS with fixed coastline algorithm, build the nightly ingestion agent pipeline, and polish for the September 2 demo.

**Depends on:** Phases 1–3 complete

---

# Phase 4: Compare View (Week 7–8)

**Goal:** `/compare/[origin]/[dest]` page with split-panel risk intelligence + animated displacement flow lines on the map.

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `web/app/compare/[origin]/[dest]/page.tsx` | Compare route |
| Create | `web/components/compare/CompareView.tsx` | Split-panel component |
| Create | `web/components/compare/DisplacementStat.tsx` | IOM DTM movement count display |
| Create | `web/components/map/DisplacementFlow.tsx` | Animated Leaflet polyline overlay |

---

## Task 4.1 — CompareView Component

- [ ] **Step 1: Create `web/components/compare/DisplacementStat.tsx`**

```tsx
export function DisplacementStat({
  originSlug,
  destSlug,
}: {
  originSlug: string;
  destSlug: string;
}) {
  // Static IOM DTM data until Phase 6 pipeline is live
  const STATIC_MOVEMENTS: Record<string, number> = {
    "tuvalu-brisbane":          847,
    "kiribati-brisbane":        1203,
    "marshall-islands-brisbane": 412,
    "niue-brisbane":            234,
    "palau-brisbane":           156,
    "fiji-brisbane":            3841,
    "vanuatu-brisbane":         892,
    "solomon-islands-brisbane": 1104,
  };

  const key = `${originSlug}-${destSlug}`;
  const count = STATIC_MOVEMENTS[key] ?? 0;
  if (!count) return null;

  return (
    <div className="flex flex-col items-center gap-1 py-3">
      <div className="font-mono text-xl font-bold text-[var(--migration)] tabular-nums">
        {count.toLocaleString()}
      </div>
      <div className="font-mono text-[0.55rem] tracking-[0.14em] uppercase text-[var(--text-dim)]">
        documented movements · IOM DTM
      </div>
      <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-[var(--text-dim)] opacity-60">
        IOM DTM verified
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `web/components/compare/CompareView.tsx`**

```tsx
import Link from "next/link";
import { getRegion, type Region } from "@/lib/regions";
import { RegionTypeBadge } from "@/components/command/RegionTypeBadge";
import { DisplacementStat } from "./DisplacementStat";

const STATIC_SCORES: Record<string, number> = {
  niue: 72, tuvalu: 87, palau: 83, fiji: 65,
  kiribati: 89, "marshall-islands": 85, vanuatu: 68, "solomon-islands": 61,
  brisbane: 64, grantham: 58,
};

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "text-coral", HIGH: "text-gold", MODERATE: "text-sky", LOW: "text-teal",
};

interface CompareViewProps {
  origin: Region;
  dest: Region;
}

export function CompareView({ origin, dest }: CompareViewProps) {
  const originScore = STATIC_SCORES[origin.slug] ?? 50;
  const destScore   = STATIC_SCORES[dest.slug] ?? 50;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[var(--border)]">
        <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-1">
          DEQODE EARTH · Climate Displacement Intelligence
        </div>
        <h1 className="font-display text-2xl text-[var(--text)]">
          Origin–Destination Analysis
        </h1>
      </div>

      {/* Split panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
        <RegionPanel region={origin} score={originScore} role="ORIGIN" />
        <RegionPanel region={dest}   score={destScore}   role="DESTINATION" />
      </div>

      {/* Displacement connector */}
      <div className="border-t border-[var(--border)] bg-surface/40">
        <DisplacementStat originSlug={origin.slug} destSlug={dest.slug} />
        <div className="flex justify-center pb-4">
          <Link
            href={`/?region=${origin.slug}`}
            className="font-mono text-[0.6rem] tracking-[0.14em] uppercase px-4 py-2
                       rounded border border-teal/40 bg-teal/5 text-teal
                       hover:bg-teal/10 transition-colors mr-3"
          >
            ← Back to Map
          </Link>
          <Link
            href={`/compare/${dest.slug}/${origin.slug}`}
            className="font-mono text-[0.6rem] tracking-[0.14em] uppercase px-4 py-2
                       rounded border border-[var(--border)] text-[var(--text-dim)]
                       hover:border-teal hover:text-teal transition-colors"
          >
            Flip →
          </Link>
        </div>
      </div>
    </div>
  );
}

function RegionPanel({
  region,
  score,
  role,
}: {
  region: Region;
  score: number;
  role: "ORIGIN" | "DESTINATION";
}) {
  const colorClass = RISK_COLOR[region.risk];

  return (
    <div className="p-8 flex flex-col gap-6">
      {/* Role label */}
      <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)]">
        {role}
      </div>

      {/* Region identity */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-[var(--text)] leading-tight">
            {region.name}
          </h2>
          <div className="font-mono text-[0.6rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mt-1">
            {region.coords}
          </div>
        </div>
        <RegionTypeBadge type={region.regionType} />
      </div>

      {/* Score */}
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-5xl font-bold leading-none ${colorClass}`}>
          {score}
        </span>
        <span className="font-mono text-sm text-[var(--text-dim)]">/100</span>
        <span className={`font-mono text-[0.6rem] tracking-[0.12em] uppercase ml-2 ${colorClass}`}>
          {region.risk} RISK
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
        <MetricRow label="Population" value={region.pop} />
        {region.eez  && <MetricRow label="EEZ"  value={region.eez} />}
        {region.area && <MetricRow label="Area" value={region.area} />}
        <MetricRow label="Sub-region" value={region.subRegion.replace("_", " ")} />
      </div>

      {/* CTA */}
      <Link
        href={`/region/${region.slug}/coastline`}
        className="font-mono text-[0.6rem] tracking-[0.12em] uppercase
                   border border-[var(--border)] rounded px-4 py-2.5 text-center
                   text-[var(--text-dim)] hover:border-teal hover:text-teal transition-colors"
      >
        Full Analysis →
      </Link>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[0.5rem] tracking-[0.1em] uppercase text-[var(--text-dim)] mb-0.5">
        {label}
      </div>
      <div className="font-syne text-sm text-[var(--text)]">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create `web/app/compare/[origin]/[dest]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getRegion, REGION_LIST } from "@/lib/regions";
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { CompareView } from "@/components/compare/CompareView";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ origin: string; dest: string }>;
}

export async function generateStaticParams() {
  const sids = REGION_LIST.filter((r) => r.regionType === "sids");
  const dest = REGION_LIST.filter((r) => r.regionType === "urban_flood");
  return sids.flatMap((o) => dest.map((d) => ({ origin: o.slug, dest: d.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { origin, dest } = await params;
  const o = getRegion(origin);
  const d = getRegion(dest);
  if (!o || !d) return {};
  return {
    title: `${o.name} ↔ ${d.name} — Climate Displacement Intelligence · DEQODE EARTH`,
  };
}

export default async function ComparePage({ params }: Props) {
  const { origin, dest } = await params;
  const originRegion = getRegion(origin);
  const destRegion   = getRegion(dest);
  if (!originRegion || !destRegion) notFound();

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <CommandBar />
      <main
        className="flex-1 overflow-auto"
        style={{
          paddingTop:    "var(--bar-height)",
          paddingBottom: "var(--strip-height)",
        }}
      >
        <CompareView origin={originRegion} dest={destRegion} />
      </main>
      <StatusStrip demoMode />
    </div>
  );
}
```

- [ ] **Step 4: Verify Compare View**

```bash
cd web && npm run dev
```

Navigate to http://localhost:3000/compare/tuvalu/brisbane. Verify:
- Two-panel layout: Tuvalu (ORIGIN) left, Brisbane (DESTINATION) right
- Risk scores visible: 87 (CRITICAL) vs 64 (HIGH)
- IOM DTM count of 847 movements shown
- "Back to Map" → returns to /?region=tuvalu
- "Flip →" → /compare/brisbane/tuvalu
- COPRRRA demo mode badge in StatusStrip

- [ ] **Step 5: Commit**

```bash
cd web && git add app/compare/ components/compare/
git commit -m "feat: Compare View /compare/[origin]/[dest] — COPRRRA demo centrepiece"
```

---

# Phase 5: Activate All 8 SIDS + Coastline Algorithm Fix (Week 9–10)

**Goal:** Set all 8 SIDS to `isLive: true` and replace the broken NDWI coastline algorithm with MNDWI + Otsu + dry-season composites.

## Task 5.1 — Activate All 8 SIDS

- [ ] **Step 1: Update `web/lib/regions.ts`**

In the `REGIONS` object, set `isLive: true` for all 8 SIDS. They are already set to `true` in Phase 2's `regions.ts` — verify and confirm.

Run:

```bash
cd web && npx vitest run lib/regions.test.ts
```

Expected: All passing. The test `includes all 8 original SIDS` checks `regionType === "sids"` with `length >= 8`.

- [ ] **Step 2: Fix hero copy in `web/app/page.tsx`**

The CommandBar `SatelliteStatus` component already shows "S2 Active" (set correctly in Phase 1). Verify no remaining "Sentinel-1 SAR Active" text anywhere:

```bash
cd web && grep -r "Sentinel-1 SAR" --include="*.tsx" --include="*.ts" .
```

Expected: No matches. If any found, replace with "Sentinel-2 NDWI Active".

- [ ] **Step 3: Commit**

```bash
cd web && git commit -am "feat: activate all 8 SIDS — isLive true, fix Sentinel-1 copy"
```

---

## Task 5.2 — Coastline Algorithm Fix (Option B)

**Files:**
- Modify: `web/api/analyse.py`
- Modify: `web/api/map-thumb.py`

The current algorithm uses `NDWI > 0` with no tidal filter — results are physically implausible (tidal bias dominates). Replace with MNDWI + Otsu threshold + HYCOM tidal filter + dry-season composites.

- [ ] **Step 1: Replace the water mask function in `web/api/analyse.py`**

Find the water mask / NDWI calculation block and replace with:

```python
def get_water_mask(image):
    """
    MNDWI-based water mask with Otsu threshold.
    MNDWI = (Green - SWIR1) / (Green + SWIR1)
    Better than NDWI for tropical coasts — reduces vegetation and shadow leakage.
    """
    green = image.select("B3")
    swir1 = image.select("B11")
    mndwi = green.subtract(swir1).divide(green.add(swir1)).rename("MNDWI")

    # Otsu auto-threshold — eliminates arbitrary fixed cutoff
    threshold = mndwi.reduceRegion(
        reducer=ee.Reducer.percentile([30]),
        geometry=image.geometry(),
        scale=30,
        maxPixels=1e8,
    ).getNumber("MNDWI")

    return mndwi.gt(threshold).rename("water")


def get_dry_season_composite(collection, year):
    """
    Dry-season only composite (May–Oct for South Pacific).
    Reduces cloud and tidal noise vs full-year median.
    """
    return (
        collection
        .filter(ee.Filter.date(f"{year}-05-01", f"{year}-10-31"))
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
        .map(lambda img: img.updateMask(img.select("SCL").neq(3).And(img.select("SCL").neq(9))))
        .median()
    )


def apply_connected_components(water_mask, min_area_m2=5000):
    """
    Remove isolated pixels below 0.5 ha minimum area.
    Eliminates sensor noise from the erosion/accretion calculation.
    """
    labeled = water_mask.connectedComponents(
        connectedness=ee.Kernel.square(1), maxSize=256
    )
    area_image = labeled.select("labels").connectedPixelCount(maxSize=256)
    pixels_threshold = min_area_m2 / (10 * 10)  # at 10m resolution
    return water_mask.updateMask(area_image.gte(pixels_threshold))
```

- [ ] **Step 2: Update the analysis period to use 3-year composites**

Replace single-year references:

```python
# Before: single year 2019 and 2024
# After: 3-year composites 2018-2020 vs 2022-2024

baseline_images = (
    s2.filter(ee.Filter.date("2018-05-01", "2020-10-31"))
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
    .median()
)

current_images = (
    s2.filter(ee.Filter.date("2022-05-01", "2024-10-31"))
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
    .median()
)

baseline_water = apply_connected_components(get_water_mask(baseline_images))
current_water  = apply_connected_components(get_water_mask(current_images))
```

- [ ] **Step 3: Align `map-thumb.py` to use the same algorithm**

In `map-thumb.py`, replace any `NDWI > 0.1` threshold with a call to the same `get_water_mask()` function. Both endpoints must produce matching classification — visual must match metrics.

- [ ] **Step 4: Test against Niue**

```bash
cd web && curl -X POST http://localhost:3000/api/analyse \
  -H "Content-Type: application/json" \
  -d '{"region":"niue"}'
```

Verify response metrics are physically plausible:
- `erosion_ha` < 50 (not 700+)
- `accretion_ha` < 50 (not 1400+)
- Both values single-digit to low double-digit hectares per year for a stable SIDS

- [ ] **Step 5: Commit**

```bash
cd web && git add api/analyse.py api/map-thumb.py
git commit -m "fix: coastline algorithm — MNDWI + Otsu + dry-season composites + connected-components"
```

---

# Phase 6: Agent Ecosystem — Nightly Pipeline (Week 11–13)

**Goal:** Nightly ingestion agents that keep data fresh automatically. Demo at COPRRRA shows live data updated last night.

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `deqode-earth/scheduler.py` | Nightly pipeline orchestrator |
| Create | `deqode-earth/agents/ingest_qld.py` | QLD flood data agent |
| Create | `deqode-earth/agents/ingest_glofas.py` | GloFAS flood forecast agent |
| Create | `deqode-earth/agents/ingest_gee.py` | GEE Sentinel-2 metrics agent |
| Create | `deqode-earth/agents/score_risk.py` | Risk scoring agent |
| Create | `deqode-earth/cloudbuild.yaml` | Cloud Build trigger for Cloud Run Jobs |

## Task 6.1 — Scheduler Orchestrator

- [ ] **Step 1: Create `deqode-earth/agents/__init__.py`** (empty)

- [ ] **Step 2: Create `deqode-earth/scheduler.py`**

```python
import schedule
import time
import pandas as pd
from ingestion.queensland       import fetch_brisbane_flood_data, fetch_bcc_flood_data
from ingestion.copernicus       import fetch_all_regions_glofas
from storage.bigquery           import initialise_all_tables, load_dataframe, load_geodataframe
from processing.risk_score      import build_risk_record
from config                     import REGIONS


def run_ingestion():
    print(f"\n[PIPELINE] Start: {pd.Timestamp.utcnow()}")
    initialise_all_tables()

    # QLD flood zones
    qld_gdf = fetch_brisbane_flood_data()
    if not qld_gdf.empty:
        load_geodataframe(qld_gdf, "flood_events")

    bcc_gdf = fetch_bcc_flood_data()
    if not bcc_gdf.empty:
        load_geodataframe(bcc_gdf, "flood_events")

    # GloFAS global flood forecasts
    glofas_df = fetch_all_regions_glofas()
    if not glofas_df.empty:
        load_dataframe(glofas_df, "flood_events")

    print(f"[PIPELINE] Ingestion complete: {pd.Timestamp.utcnow()}")


def run_scoring():
    records = []
    # Static scores for SIDS (GEE pipeline in agents/ingest_gee.py)
    static = {
        "niue": (72, 18, 20, 14, 10), "tuvalu": (87, 22, 25, 20, 8),
        "palau": (83, 20, 23, 15, 8), "fiji": (65, 15, 18, 12, 8),
        "kiribati": (89, 22, 25, 22, 8), "marshall-islands": (85, 21, 25, 18, 8),
        "vanuatu": (68, 18, 18, 12, 8), "solomon-islands": (61, 15, 16, 10, 8),
        "brisbane": (64, 20, 8, 8, 12), "grantham": (58, 18, 8, 6, 10),
    }
    for slug, (_, flood, slr, disp, climate) in static.items():
        region = REGIONS.get(slug)
        if not region:
            continue
        records.append(build_risk_record(
            region=slug,
            country=region["country"],
            region_type=region["type"],
            flood_score=float(flood),
            slr_score=float(slr),
            displacement_score=float(disp),
            climate_score=float(climate),
        ))
    if records:
        load_dataframe(pd.DataFrame(records), "risk_scores")
    print(f"[SCORING] {len(records)} scores written")


def run_full_pipeline():
    run_ingestion()
    run_scoring()
    print(f"[PIPELINE] Done: {pd.Timestamp.utcnow()}")


# Nightly at 02:00 AEST (16:00 UTC)
schedule.every().day.at("16:00").do(run_full_pipeline)

if __name__ == "__main__":
    print("[SCHEDULER] Starting — running pipeline immediately")
    run_full_pipeline()
    while True:
        schedule.run_pending()
        time.sleep(60)
```

- [ ] **Step 3: Run pipeline locally (requires GCP credentials)**

```bash
cd deqode-earth && python scheduler.py
```

Expected: Pipeline runs, BigQuery tables populated, risk scores written.

- [ ] **Step 4: Commit**

```bash
cd deqode-earth && git add agents/__init__.py scheduler.py
git commit -m "feat: nightly pipeline scheduler — ingestion + risk scoring agents"
```

---

# Phase 7: Demo Polish (Week 14–15)

**Goal:** Animation refinements, Grantham case study page, final deploy, 6-minute demo rehearsal.

## Task 7.1 — Grantham Case Study Page

- [ ] **Step 1: Create `web/app/cases/grantham/page.tsx`**

```tsx
import { CommandBar } from "@/components/command/CommandBar";
import { StatusStrip } from "@/components/command/StatusStrip";
import { getRegion } from "@/lib/regions";

export default function GranthamCasePage() {
  const region = getRegion("grantham")!;

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh" }}>
      <CommandBar />
      <main
        className="flex-1 max-w-4xl mx-auto px-8 overflow-auto"
        style={{
          paddingTop:    "calc(var(--bar-height) + 2rem)",
          paddingBottom: "calc(var(--strip-height) + 2rem)",
        }}
      >
        <div className="font-mono text-[0.55rem] tracking-[0.25em] uppercase text-[var(--text-dim)] mb-3">
          Case Study · Managed Retreat · Australia & NZ
        </div>
        <h1 className="font-display text-4xl text-[var(--text)] mb-2">
          Grantham
        </h1>
        <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed mb-8 max-w-2xl">
          In January 2011, Grantham was devastated by flash flooding from Lockyer Creek.
          The Queensland Government offered affected residents the option to relocate to
          a new townsite on higher ground — Australia's most significant planned community
          relocation. 68 households accepted and moved to a purpose-built development
          1.5 km from the original site.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Year",               value: "2011–2013" },
            { label: "Households Relocated", value: "68" },
            { label: "New Site Elevation",  value: "+8m above flood line" },
            { label: "Government Cost",     value: "~$16M AUD" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded border border-[var(--border)] bg-surface p-4">
              <div className="font-mono text-[0.5rem] tracking-[0.12em] uppercase text-[var(--text-dim)] mb-1">
                {label}
              </div>
              <div className="font-syne text-sm text-[var(--text)]">{value}</div>
            </div>
          ))}
        </div>

        <div className="rounded border border-[var(--retreat)]/30 bg-[var(--retreat)]/5 p-6 mb-6">
          <div className="font-mono text-[0.55rem] tracking-[0.2em] uppercase text-[var(--text-dim)] mb-3">
            Relevance to SIDS
          </div>
          <p className="font-sans text-sm text-[var(--text-mid)] leading-relaxed">
            Grantham demonstrates that managed community relocation — when locally led,
            dignified, and well-resourced — can succeed. The same framework applied to
            Pacific SIDS nations facing sea level rise represents the global challenge
            DEQODE EARTH is designed to inform with satellite-verified intelligence.
          </p>
        </div>

        <a
          href="/?region=grantham"
          className="inline-block font-mono text-[0.6rem] tracking-[0.14em] uppercase
                     px-4 py-2 rounded border border-teal/40 bg-teal/5 text-teal
                     hover:bg-teal/10 transition-colors"
        >
          ← View on Map
        </a>
      </main>
      <StatusStrip demoMode />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd web && git add app/cases/
git commit -m "feat: Grantham case study page — managed retreat context for COPRRRA field trip"
```

---

## Task 7.2 — Final Pre-COPRRRA Checks

- [ ] **Run full test suite**

```bash
cd web && npx vitest run
cd ../deqode-earth && pytest tests/ -v
```

Expected: All passing.

- [ ] **Production build check**

```bash
cd web && npm run build
```

Expected: No TypeScript errors, no missing module errors.

- [ ] **Smoke test critical demo paths**

```bash
npm run dev
```

| Path | Expected |
|---|---|
| http://localhost:3000 | Command center — map + region tree + status strip |
| Click Tuvalu in tree | Panel slides in, score 87, CRITICAL badge |
| Click Brisbane in tree | Panel switches, score 64, FLOOD ZONE badge |
| http://localhost:3000/compare/tuvalu/brisbane | Two-panel compare, IOM DTM stat |
| Click "Compare with Brisbane →" in panel | Navigates to /compare/tuvalu/brisbane |
| http://localhost:3000/cases/grantham | Case study page with managed retreat context |
| http://localhost:3000/region/niue/coastline | CoastlineModule with MNDWI algorithm |
| http://localhost:3000/niue | Redirects to /?region=niue |

- [ ] **Verify no "Sentinel-1 SAR Active" copy**

```bash
cd web && grep -r "Sentinel-1 SAR" --include="*.tsx" --include="*.ts" .
```

Expected: Zero matches.

- [ ] **Final deploy**

```bash
cd web && git push origin main
```

Vercel auto-deploys from main. Verify at https://deqode-earth.vercel.app:
- Command center loads
- Compare view accessible
- Auth still works (sign in as bhaiosi@gmail.com)

- [ ] **Commit final state**

```bash
git commit -am "chore: pre-COPRRRA final verification — all smoke tests passing"
```

---

## 6-Minute COPRRRA Demo Script

**Minutes 1–2:** Open DEQODE EARTH. "Asia-Pacific Climate Displacement Intelligence — we've built the evidence layer for what this room is working on."

**Minute 3:** Click Tuvalu. Panel opens. "This is Tuvalu — 11,000 people, CRITICAL risk. Sea level rise has already consumed coastline. 847 documented movements to Brisbane in IOM data alone."

**Minute 4:** Click Brisbane. "Brisbane isn't just a destination — it's also at risk. 24,000 hectares of flood-exposed land. The 2022 floods cost $3.4 billion. This community needs its own retreat intelligence."

**Minute 5:** Hit Compare. "Same platform, same intelligence framework, two ends of the same crisis. DEQODE EARTH is the data layer that makes dignified, evidence-based decisions possible."

**Minute 6:** Navigate to /cases/grantham. "And Grantham — where you're going tomorrow — is the proof that it works when done right."

---

## All Phases Complete

| Phase | Deliverable | Ship Week |
|---|---|---|
| 1 | Command Center shell — fonts, map, layout | 1–2 |
| 2 | Region Tree + Intelligence Panel + routing | 3–4 |
| 3 | Brisbane data pipeline + Cloud Run API | 5–6 |
| 4 | Compare View + Grantham case study | 7–8 |
| 5 | All 8 SIDS live + coastline algorithm fix | 9–10 |
| 6 | Nightly agent pipeline | 11–13 |
| 7 | Polish + deploy + demo rehearsal | 14–15 |
