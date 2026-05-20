# DEQODE EARTH Revamp — Phase 3: Brisbane Flood Data Pipeline

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Brisbane flood data ingestion pipeline (QLD Open Data + GloFAS), BigQuery schema, and Cloud Run API. Wire Brisbane flood metrics into the Intelligence Panel.

**Architecture:** Python ingestion scripts run as Cloud Run Jobs on a nightly schedule. Data lands in BigQuery (`deqode_earth` dataset). A Flask REST API on Cloud Run serves risk scores to the Next.js frontend. A new Vercel API route `/api/flood-data` proxies the Cloud Run API during dev. Total cost: $0 (GCP free tier + TOFI Earth Engine access).

**Tech Stack:** Python 3.11, Flask, BigQuery, Cloud Run, GCS, Vercel Python serverless, pytest

**Depends on:** Phase 2 complete

**Root:** All Python files live in `deqode-earth/` (the repo root, not `web/`)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `deqode-earth/.env.example` | All required env vars documented |
| Create | `deqode-earth/config.py` | Region bounding boxes, env loading |
| Create | `deqode-earth/ingestion/queensland.py` | QLD Open Data flood zone ingestion |
| Create | `deqode-earth/ingestion/copernicus.py` | GloFAS flood forecast ingestion |
| Create | `deqode-earth/storage/bigquery.py` | BQ client, schema, load helpers |
| Create | `deqode-earth/processing/risk_score.py` | Composite risk scoring engine |
| Create | `deqode-earth/api/main.py` | Flask REST API |
| Create | `deqode-earth/api/routes.py` | Route handlers |
| Create | `deqode-earth/Dockerfile` | Cloud Run container |
| Create | `deqode-earth/requirements.txt` | Python deps |
| Create | `deqode-earth/tests/test_risk_score.py` | pytest for risk scoring |
| Create | `deqode-earth/tests/test_config.py` | pytest for config/regions |
| Create | `web/app/api/flood-data/route.ts` | Next.js proxy to Cloud Run API |

---

## Task 3.1 — Config + Requirements

- [ ] **Step 1: Create `deqode-earth/requirements.txt`**

```
google-cloud-bigquery==3.27.0
google-cloud-storage==2.19.0
earthengine-api==1.7.21
requests==2.32.3
geopandas==1.0.1
pandas==2.2.3
shapely==2.0.6
geojson==3.1.0
flask==3.1.0
gunicorn==23.0.0
python-dotenv==1.0.1
pytest==8.3.3
```

- [ ] **Step 2: Create `deqode-earth/.env.example`**

```
GCP_PROJECT_ID=your-gcp-project-id
GCP_DATASET_ID=deqode_earth
GCS_BUCKET=deqode-earth-raw
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
EE_SERVICE_ACCOUNT=your-ee-sa@project.iam.gserviceaccount.com
EE_KEY_FILE=./ee-key.json
COPERNICUS_CLIENT_ID=your-copernicus-client-id
COPERNICUS_CLIENT_SECRET=your-copernicus-client-secret
CLOUD_RUN_API_URL=https://deqode-earth-api-xxxx-uc.a.run.app
```

- [ ] **Step 3: Create `deqode-earth/config.py`**

```python
import os
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv("GCP_PROJECT_ID")
DATASET_ID = os.getenv("GCP_DATASET_ID", "deqode_earth")
GCS_BUCKET = os.getenv("GCS_BUCKET", "deqode-earth-raw")
EE_SA      = os.getenv("EE_SERVICE_ACCOUNT")
EE_KEY     = os.getenv("EE_KEY_FILE")

REGIONS = {
    "brisbane": {
        "name": "Brisbane Flood Zones",
        "country": "Australia",
        "bbox": [152.6, -27.8, 153.5, -27.2],
        "type": "urban_flood",
    },
    "grantham": {
        "name": "Grantham",
        "country": "Australia",
        "bbox": [152.1, -27.7, 152.3, -27.5],
        "type": "managed_retreat",
    },
    "tuvalu": {
        "name": "Tuvalu",
        "country": "Tuvalu",
        "bbox": [179.0, -8.7, 179.3, -8.4],
        "type": "sids",
    },
    "niue": {
        "name": "Niue",
        "country": "Niue",
        "bbox": [-169.9647, -19.155, -169.78, -18.955],
        "type": "sids",
    },
    "palau": {
        "name": "Palau",
        "country": "Palau",
        "bbox": [134.4, 7.0, 134.7, 7.4],
        "type": "sids",
    },
    "fiji": {
        "name": "Fiji",
        "country": "Fiji",
        "bbox": [177.0, -19.2, -179.8, -16.0],
        "type": "sids",
    },
    "kiribati": {
        "name": "Kiribati",
        "country": "Kiribati",
        "bbox": [172.9, 1.3, 173.1, 1.5],
        "type": "sids",
    },
    "marshall-islands": {
        "name": "Marshall Islands",
        "country": "Marshall Islands",
        "bbox": [171.0, 7.0, 171.4, 7.2],
        "type": "sids",
    },
    "vanuatu": {
        "name": "Vanuatu",
        "country": "Vanuatu",
        "bbox": [168.1, -17.8, 168.5, -17.5],
        "type": "sids",
    },
    "solomon-islands": {
        "name": "Solomon Islands",
        "country": "Solomon Islands",
        "bbox": [159.9, -9.5, 160.2, -9.3],
        "type": "sids",
    },
}
```

- [ ] **Step 4: Create `deqode-earth/tests/test_config.py`**

```python
import pytest
from config import REGIONS, DATASET_ID

def test_brisbane_in_regions():
    assert "brisbane" in REGIONS
    assert REGIONS["brisbane"]["type"] == "urban_flood"

def test_grantham_in_regions():
    assert "grantham" in REGIONS
    assert REGIONS["grantham"]["type"] == "managed_retreat"

def test_all_regions_have_bbox():
    for key, region in REGIONS.items():
        assert len(region["bbox"]) == 4, f"{key} missing bbox"

def test_dataset_id_default():
    assert DATASET_ID == "deqode_earth"
```

- [ ] **Step 5: Run tests**

```bash
cd deqode-earth && pip install -r requirements.txt && pytest tests/test_config.py -v
```

Expected: 4 passing

- [ ] **Step 6: Commit**

```bash
cd deqode-earth && git add requirements.txt .env.example config.py tests/test_config.py
git commit -m "feat: pipeline config with Asia-Pacific regions and env setup"
```

---

## Task 3.2 — BigQuery Schema

**Files:**
- Create: `deqode-earth/storage/bigquery.py`

- [ ] **Step 1: Create `deqode-earth/storage/__init__.py`** (empty)

- [ ] **Step 2: Create `deqode-earth/storage/bigquery.py`**

```python
from google.cloud import bigquery
import pandas as pd
import geopandas as gpd
from config import PROJECT_ID, DATASET_ID

client = bigquery.Client(project=PROJECT_ID)

SCHEMAS = {
    "flood_events": [
        bigquery.SchemaField("region",          "STRING"),
        bigquery.SchemaField("region_type",     "STRING"),
        bigquery.SchemaField("country",         "STRING"),
        bigquery.SchemaField("source_dataset",  "STRING"),
        bigquery.SchemaField("source",          "STRING"),
        bigquery.SchemaField("event_date",      "DATE"),
        bigquery.SchemaField("risk_level",      "STRING"),
        bigquery.SchemaField("flood_depth_m",   "FLOAT64"),
        bigquery.SchemaField("return_period",   "INTEGER"),
        bigquery.SchemaField("geometry_wkt",    "STRING"),
        bigquery.SchemaField("ingested_at",     "TIMESTAMP"),
    ],
    "displacement_data": [
        bigquery.SchemaField("region",           "STRING"),
        bigquery.SchemaField("country",          "STRING"),
        bigquery.SchemaField("region_group",     "STRING"),
        bigquery.SchemaField("displaced_count",  "INTEGER"),
        bigquery.SchemaField("displacement_type","STRING"),
        bigquery.SchemaField("driver",           "STRING"),
        bigquery.SchemaField("report_date",      "DATE"),
        bigquery.SchemaField("source",           "STRING"),
        bigquery.SchemaField("ingested_at",      "TIMESTAMP"),
    ],
    "climate_projections": [
        bigquery.SchemaField("region",          "STRING"),
        bigquery.SchemaField("country",         "STRING"),
        bigquery.SchemaField("scenario",        "STRING"),
        bigquery.SchemaField("period",          "STRING"),
        bigquery.SchemaField("mean_temp_k",     "FLOAT64"),
        bigquery.SchemaField("mean_precip",     "FLOAT64"),
        bigquery.SchemaField("slr_1m_area_m2",  "FLOAT64"),
        bigquery.SchemaField("slr_2m_area_m2",  "FLOAT64"),
        bigquery.SchemaField("slr_5m_area_m2",  "FLOAT64"),
        bigquery.SchemaField("source",          "STRING"),
        bigquery.SchemaField("fetched_at",      "TIMESTAMP"),
    ],
    "risk_scores": [
        bigquery.SchemaField("region",              "STRING"),
        bigquery.SchemaField("country",             "STRING"),
        bigquery.SchemaField("region_type",         "STRING"),
        bigquery.SchemaField("composite_score",     "FLOAT64"),
        bigquery.SchemaField("flood_score",         "FLOAT64"),
        bigquery.SchemaField("slr_score",           "FLOAT64"),
        bigquery.SchemaField("displacement_score",  "FLOAT64"),
        bigquery.SchemaField("climate_score",       "FLOAT64"),
        bigquery.SchemaField("risk_tier",           "STRING"),
        bigquery.SchemaField("calculated_at",       "TIMESTAMP"),
    ],
}


def create_dataset_if_not_exists():
    dataset_ref = f"{PROJECT_ID}.{DATASET_ID}"
    try:
        client.get_dataset(dataset_ref)
    except Exception:
        dataset = bigquery.Dataset(dataset_ref)
        dataset.location = "australia-southeast1"
        client.create_dataset(dataset)
        print(f"[BQ] Created dataset {DATASET_ID}")


def create_table_if_not_exists(table_name: str):
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
    schema = SCHEMAS.get(table_name, [])
    try:
        client.get_table(table_ref)
    except Exception:
        table = bigquery.Table(table_ref, schema=schema)
        client.create_table(table)
        print(f"[BQ] Created table {table_name}")


def load_dataframe(df: pd.DataFrame, table_name: str, write_mode: str = "WRITE_APPEND"):
    table_ref = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
    job_config = bigquery.LoadJobConfig(
        write_disposition=write_mode,
        autodetect=table_name not in SCHEMAS,
        schema=SCHEMAS.get(table_name, []),
    )
    job = client.load_table_from_dataframe(df, table_ref, job_config=job_config)
    job.result()
    print(f"[BQ] Loaded {len(df)} rows → {table_name}")


def load_geodataframe(gdf: gpd.GeoDataFrame, table_name: str):
    df = gdf.copy()
    if "geometry" in df.columns:
        df["geometry_wkt"] = df["geometry"].apply(lambda g: g.wkt if g else None)
        df = df.drop(columns=["geometry"])
    load_dataframe(df, table_name)


def initialise_all_tables():
    create_dataset_if_not_exists()
    for table_name in SCHEMAS:
        create_table_if_not_exists(table_name)
    print("[BQ] All tables ready")
```

- [ ] **Step 3: Commit**

```bash
cd deqode-earth && git add storage/__init__.py storage/bigquery.py
git commit -m "feat: BigQuery schema — flood_events, displacement_data, climate_projections, risk_scores"
```

---

## Task 3.3 — QLD Open Data Ingestion

**Files:**
- Create: `deqode-earth/ingestion/__init__.py`
- Create: `deqode-earth/ingestion/queensland.py`

- [ ] **Step 1: Create `deqode-earth/ingestion/queensland.py`**

```python
import requests
import geopandas as gpd
import pandas as pd
from io import BytesIO
from config import REGIONS

QLD_BASE = "https://www.data.qld.gov.au/api/3/action"
BCC_API  = "https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets"

QLD_DATASETS = {
    "flood_risk_overall":  "flood-awareness-flood-risk-overall",
    "flood_2022_brisbane": "flood-awareness-historic-brisbane-river-and-creek-floods-feb-2022",
    "overland_flow":       "flood-awareness-overland-flow",
    "floodplain_overlay":  "queensland-floodplain-assessment-overlay",
}

BCC_DATASETS = [
    "flood-awareness-flood-risk-overall",
    "flood-awareness-creek-river-storm-tide-1pct",
]


def _get_dataset_resources(dataset_id: str) -> list:
    resp = requests.get(f"{QLD_BASE}/package_show", params={"id": dataset_id}, timeout=60)
    resp.raise_for_status()
    return resp.json()["result"]["resources"]


def _download_geojson(resource_url: str) -> gpd.GeoDataFrame:
    resp = requests.get(resource_url, timeout=120)
    resp.raise_for_status()
    return gpd.read_file(BytesIO(resp.content))


def fetch_brisbane_flood_data() -> gpd.GeoDataFrame:
    frames = []
    for label, dataset_id in QLD_DATASETS.items():
        try:
            resources = _get_dataset_resources(dataset_id)
            target = next(
                (r for r in resources if "geojson" in r["format"].lower()), None
            ) or next(
                (r for r in resources if "shp" in r["format"].lower()), None
            )
            if not target:
                print(f"[QLD] No spatial resource for {label}")
                continue
            gdf = _download_geojson(target["url"])
            gdf["source_dataset"] = label
            gdf["region"]         = "brisbane"
            gdf["region_type"]    = "urban_flood"
            gdf["country"]        = "Australia"
            gdf["source"]         = "qld_open_data"
            gdf["ingested_at"]    = pd.Timestamp.utcnow().isoformat()
            frames.append(gdf)
            print(f"[QLD] ✓ {label} — {len(gdf)} features")
        except Exception as e:
            print(f"[QLD] ✗ {label} — {e}")
    return pd.concat(frames, ignore_index=True) if frames else gpd.GeoDataFrame()


def fetch_bcc_flood_data() -> gpd.GeoDataFrame:
    frames = []
    for ds in BCC_DATASETS:
        url = f"{BCC_API}/{ds}/exports/geojson"
        try:
            resp = requests.get(url, timeout=120)
            resp.raise_for_status()
            gdf = gpd.read_file(BytesIO(resp.content))
            gdf["source"]      = ds
            gdf["region"]      = "brisbane"
            gdf["region_type"] = "urban_flood"
            gdf["country"]     = "Australia"
            gdf["ingested_at"] = pd.Timestamp.utcnow().isoformat()
            frames.append(gdf)
            print(f"[BCC] ✓ {ds}")
        except Exception as e:
            print(f"[BCC] ✗ {ds} — {e}")
    return pd.concat(frames, ignore_index=True) if frames else gpd.GeoDataFrame()
```

- [ ] **Step 2: Commit**

```bash
cd deqode-earth && git add ingestion/__init__.py ingestion/queensland.py
git commit -m "feat: QLD Open Data + BCC flood zone ingestion"
```

---

## Task 3.4 — Risk Scoring Engine

**Files:**
- Create: `deqode-earth/processing/__init__.py`
- Create: `deqode-earth/processing/risk_score.py`
- Create: `deqode-earth/tests/test_risk_score.py`

- [ ] **Step 1: Write failing tests**

Create `deqode-earth/tests/test_risk_score.py`:

```python
import pytest
from processing.risk_score import (
    calculate_flood_score,
    calculate_slr_score,
    calculate_displacement_score,
    calculate_composite_score,
    risk_tier_from_score,
)

def test_flood_score_clamps_at_25():
    assert calculate_flood_score(avg_depth=10.0, event_count=100) == 25.0

def test_flood_score_zero_for_no_data():
    assert calculate_flood_score(avg_depth=0.0, event_count=0) == 0.0

def test_slr_score_clamps_at_25():
    assert calculate_slr_score(slr_1m_area_m2=1e10, slr_2m_area_m2=1e10) == 25.0

def test_displacement_score_clamps_at_25():
    assert calculate_displacement_score(total_displaced=100_000) == 25.0

def test_composite_score_sums_components():
    score = calculate_composite_score(
        flood_score=10.0,
        slr_score=15.0,
        displacement_score=5.0,
        climate_score=8.0,
    )
    assert score == 38.0

def test_risk_tier_critical():
    assert risk_tier_from_score(80) == "critical"

def test_risk_tier_high():
    assert risk_tier_from_score(60) == "high"

def test_risk_tier_medium():
    assert risk_tier_from_score(35) == "medium"

def test_risk_tier_low():
    assert risk_tier_from_score(10) == "low"
```

- [ ] **Step 2: Run test — verify fails**

```bash
cd deqode-earth && pytest tests/test_risk_score.py -v
```

Expected: `ModuleNotFoundError`

- [ ] **Step 3: Create `deqode-earth/processing/risk_score.py`**

```python
import pandas as pd
from typing import Optional


def calculate_flood_score(avg_depth: float, event_count: int) -> float:
    return min(25.0, avg_depth * 5 + event_count * 0.5)


def calculate_slr_score(slr_1m_area_m2: float, slr_2m_area_m2: float) -> float:
    return min(25.0, slr_1m_area_m2 / 1_000_000 * 10 + slr_2m_area_m2 / 1_000_000 * 5)


def calculate_displacement_score(total_displaced: int) -> float:
    return min(25.0, total_displaced / 1000)


def calculate_climate_score(mean_temp_k: float, baseline_k: float = 288.0) -> float:
    return min(25.0, max(0.0, (mean_temp_k - baseline_k) * 5))


def calculate_composite_score(
    flood_score: float,
    slr_score: float,
    displacement_score: float,
    climate_score: float,
) -> float:
    return flood_score + slr_score + displacement_score + climate_score


def risk_tier_from_score(score: float) -> str:
    if score >= 75:
        return "critical"
    if score >= 50:
        return "high"
    if score >= 25:
        return "medium"
    return "low"


def build_risk_record(
    region: str,
    country: str,
    region_type: str,
    flood_score: float,
    slr_score: float,
    displacement_score: float,
    climate_score: float,
) -> dict:
    composite = calculate_composite_score(
        flood_score, slr_score, displacement_score, climate_score
    )
    return {
        "region":             region,
        "country":            country,
        "region_type":        region_type,
        "composite_score":    round(composite, 2),
        "flood_score":        round(flood_score, 2),
        "slr_score":          round(slr_score, 2),
        "displacement_score": round(displacement_score, 2),
        "climate_score":      round(climate_score, 2),
        "risk_tier":          risk_tier_from_score(composite),
        "calculated_at":      pd.Timestamp.utcnow().isoformat(),
    }
```

- [ ] **Step 4: Run tests — verify passing**

```bash
cd deqode-earth && pytest tests/test_risk_score.py -v
```

Expected: 9 passing

- [ ] **Step 5: Commit**

```bash
cd deqode-earth && git add processing/__init__.py processing/risk_score.py tests/test_risk_score.py
git commit -m "feat: risk scoring engine with TDD — flood/SLR/displacement/climate components"
```

---

## Task 3.5 — Cloud Run API

**Files:**
- Create: `deqode-earth/api/__init__.py`
- Create: `deqode-earth/api/main.py`
- Create: `deqode-earth/Dockerfile`

- [ ] **Step 1: Create `deqode-earth/api/main.py`**

```python
from flask import Flask, jsonify, request
from google.cloud import bigquery
from config import PROJECT_ID, DATASET_ID, REGIONS
import os

app    = Flask(__name__)
client = bigquery.Client(project=PROJECT_ID)


def query_bq(sql: str) -> list:
    return [dict(row) for row in client.query(sql).result()]


@app.route("/health")
def health():
    return jsonify({"status": "ok", "service": "deqode-earth-api"})


@app.route("/regions")
def get_regions():
    return jsonify({"regions": [{"key": k, **v} for k, v in REGIONS.items()]})


@app.route("/risk-scores")
def get_risk_scores():
    region = request.args.get("region")
    where  = f"WHERE region = '{region}'" if region else ""
    sql = f"""
        SELECT region, composite_score, flood_score, slr_score,
               displacement_score, climate_score, risk_tier, calculated_at
        FROM `{PROJECT_ID}.{DATASET_ID}.risk_scores`
        {where}
        QUALIFY ROW_NUMBER() OVER (PARTITION BY region ORDER BY calculated_at DESC) = 1
        ORDER BY composite_score DESC
    """
    return jsonify({"risk_scores": query_bq(sql)})


@app.route("/compare")
def compare_regions():
    sql = f"""
        SELECT r.region, r.region_type, r.country,
               r.composite_score, r.risk_tier,
               c.slr_1m_area_m2, c.slr_2m_area_m2,
               c.mean_temp_k, c.mean_precip
        FROM `{PROJECT_ID}.{DATASET_ID}.risk_scores` r
        LEFT JOIN `{PROJECT_ID}.{DATASET_ID}.climate_projections` c
               ON r.region = c.region
        QUALIFY ROW_NUMBER() OVER (PARTITION BY r.region ORDER BY r.calculated_at DESC) = 1
        ORDER BY r.composite_score DESC
    """
    return jsonify({"comparison": query_bq(sql)})


@app.route("/flood-events")
def get_flood_events():
    region        = request.args.get("region", "brisbane")
    return_period = request.args.get("return_period", 100)
    sql = f"""
        SELECT region, country, source, event_date, risk_level,
               flood_depth_m, return_period, geometry_wkt, ingested_at
        FROM `{PROJECT_ID}.{DATASET_ID}.flood_events`
        WHERE region = '{region}'
          AND return_period <= {int(return_period)}
        ORDER BY event_date DESC
        LIMIT 50
    """
    return jsonify({"flood_events": query_bq(sql)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
```

- [ ] **Step 2: Create `deqode-earth/Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PORT=8080
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "1", "--timeout", "60", "api.main:app"]
```

- [ ] **Step 3: Create `web/app/api/flood-data/route.ts`** (Next.js proxy)

```typescript
import { NextResponse } from "next/server";

const CLOUD_RUN_URL = process.env.CLOUD_RUN_API_URL ?? "http://localhost:8080";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? "brisbane";

  try {
    const res = await fetch(`${CLOUD_RUN_URL}/risk-scores?region=${region}`, {
      next: { revalidate: 900 }, // 15-min cache
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    // Return static fallback during dev / before Cloud Run is live
    return NextResponse.json({
      risk_scores: [
        {
          region,
          composite_score: region === "brisbane" ? 64 : 50,
          risk_tier: "high",
          flood_score: 18,
          slr_score: 12,
          displacement_score: 8,
          climate_score: 10,
          calculated_at: new Date().toISOString(),
        },
      ],
    });
  }
}
```

- [ ] **Step 4: Deploy Cloud Run (run when GCP credentials are ready)**

```bash
cd deqode-earth
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/deqode-earth-api
gcloud run deploy deqode-earth-api \
  --image gcr.io/$GCP_PROJECT_ID/deqode-earth-api \
  --platform managed \
  --region australia-southeast1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 3
```

- [ ] **Step 5: Commit**

```bash
cd deqode-earth && git add api/__init__.py api/main.py Dockerfile
cd ../web && git add app/api/flood-data/route.ts
git commit -m "feat: Cloud Run Flask API + Next.js proxy route with static fallback"
```

---

## Phase 3 Complete

Verify before Phase 4:
- [ ] `pytest tests/ -v` — all passing (12+ tests)
- [ ] `python -c "from storage.bigquery import initialise_all_tables; print('ok')"` — no import errors
- [ ] `npm run build` in web/ — clean build
- [ ] http://localhost:3000/api/flood-data?region=brisbane — returns JSON (static fallback)
