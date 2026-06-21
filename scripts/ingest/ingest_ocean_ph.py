"""
Copernicus Marine Service ocean pH (OMI_HEALTH) -> Supabase ocean_metrics
Global mean surface ocean pH, yearly resolution, 1985-present.

Dataset: global_omi_health_carbon_ph_area_averaged (product: GLOBAL_OMI_HEALTH_carbon_ph_area_averaged)
DOI: 10.48670/moi-00224
Confirmed live against the catalogue via `copernicusmarine describe` on 2026-06-17:
variables are "ph" (sea_water_ph_reported_on_total_scale) and "ph_uncertainty",
yearly resolution, last value as of that check was 2024-01-01.
This is a GLOBAL area-averaged index, not region-specific -- there is no
verified per-SIDS gridded pH product wired up yet, so the same global value
is applied to every region. Acidification is a slow, globally-coupled signal,
so this is a reasonable proxy at this stage; a region-specific gridded
product (e.g. MULTIOBS_GLO_BIO_CARBON_SURFACE_REP_015_008) is a future
upgrade once its exact variable layout is confirmed against a live account.

Requires a free Copernicus Marine account (https://marine.copernicus.eu —
self-service registration, same tier of effort as the existing GEE/TOFI
setup). Env vars: COPERNICUS_MARINE_USERNAME, COPERNICUS_MARINE_PASSWORD.
If unset, this script SKIPS cleanly (exit 0) rather than failing the
nightly workflow -- mirrors the optional-credential pattern used for
JRC GloFAS (GEE_B64_KEY).
"""
import os
import sys
import logging
import tempfile
from pathlib import Path

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

DATASET_ID = "global_omi_health_carbon_ph_area_averaged"
VARIABLE_NAME = "ph"


def fetch_latest_ph(username: str, password: str) -> tuple[str, float] | None:
    import copernicusmarine
    import xarray as xr

    with tempfile.TemporaryDirectory() as tmpdir:
        result = copernicusmarine.get(
            dataset_id=DATASET_ID,
            username=username,
            password=password,
            output_directory=tmpdir,
            output_filename="ocean_ph.nc",
            overwrite=True,
        )
        file_paths = [
            Path(path)
            for path in (
                result
                if isinstance(result, list)
                else getattr(result, "file_path", None)
                or getattr(result, "file_paths", [])
                or []
            )
        ]
        file_path = Path(tmpdir) / "ocean_ph.nc"
        if not file_path.exists() and file_paths:
            file_path = file_paths[0]
        if not file_path.exists():
            matches = list(Path(tmpdir).glob("*.nc"))
            if matches:
                file_path = matches[0]

        ds = xr.open_dataset(file_path)
        if not ds.data_vars:
            return None

        var_name = VARIABLE_NAME if VARIABLE_NAME in ds.data_vars else list(ds.data_vars)[0]
        series = ds[var_name].to_series().dropna()
        if series.empty:
            return None

        latest_time = series.index[-1]
        latest_value = float(series.iloc[-1])
        recorded_date = str(latest_time)[:10]
        return recorded_date, latest_value


def main():
    username = os.environ.get("COPERNICUS_MARINE_USERNAME", "")
    password = os.environ.get("COPERNICUS_MARINE_PASSWORD", "")

    if not username or not password:
        log.warning(
            "SKIP: ocean_ph -- COPERNICUS_MARINE_USERNAME/PASSWORD not configured; "
            "register free at marine.copernicus.eu and add as repo secrets to activate"
        )
        return

    try:
        result = fetch_latest_ph(username, password)
    except Exception as e:
        log.warning(f"WARN: ocean_ph -- fetch failed: {e}")
        sys.exit(1)

    if not result:
        log.error("FAIL: ocean_ph -- no data in response")
        sys.exit(1)

    recorded_date, value = result

    from supabase import create_client
    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

    region_slugs = [
        "niue", "tuvalu", "fiji", "vanuatu", "solomon-islands",
        "palau", "kiribati", "marshall-islands", "brisbane",
    ]
    records = [
        {
            "source": "copernicus_marine",
            "region_slug": slug,
            "metric_type": "ph",
            "recorded_date": recorded_date,
            "value": round(value, 3),
            "unit": "ph",
        }
        for slug in region_slugs
    ]

    supabase.table("ocean_metrics").upsert(
        records,
        on_conflict="source,region_slug,metric_type,recorded_date",
    ).execute()
    log.info(f"OK: ocean_ph -- {value} on {recorded_date}, applied to {len(records)} regions")


if __name__ == "__main__":
    main()
