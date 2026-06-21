import unittest
from datetime import datetime, timezone

from ingest_bcc_flood import polygonal_geometry, resolve_flood_class
from ingest_ocean_sst import latest_valid_record, query_window
from ingest_pdh_stat import parse_population_records
from ingest_qld_2011 import ensure_multipolygon
from ingest_wmip_gauges import latest_numeric_value, station_id


class PdhStatParsingTests(unittest.TestCase):
    def test_keeps_only_total_population_series(self):
        csv_text = """GEO_PICT,INDICATOR,SEX,AGE,TIME_PERIOD,OBS_VALUE,UNIT_MEASURE
TV,MIDYEARPOPEST,_T,_T,2050,12000,N
TV,POPPROP,_T,_T,2050,0.01,PERCENT
TV,MIDYEARPOPEST,F,_T,2050,6000,N
TV,MIDYEARPOPEST,_T,Y00T04,2050,1000,N
"""
        self.assertEqual(
            parse_population_records(csv_text),
            [
                {
                    "source": "pdh_stat",
                    "country_code": "TV",
                    "country_name": "Tuvalu",
                    "year": 2050,
                    "population": 12000,
                    "data_type": "projection",
                }
            ],
        )


class BccParsingTests(unittest.TestCase):
    def test_uses_fallback_class_field(self):
        self.assertEqual(
            resolve_flood_class({"SOURCE_TYPE": "RIVER"}, "FLOOD_TYPE", ["SOURCE_TYPE"]),
            "high",
        )

    def test_rejects_missing_class(self):
        self.assertIsNone(resolve_flood_class({}, "FLOOD_RISK", []))

    def test_wraps_polygon_as_multipolygon(self):
        from shapely.geometry import Polygon

        polygon = Polygon([(0, 0), (1, 0), (1, 1), (0, 0)])
        geometry = polygonal_geometry(polygon)
        self.assertEqual(geometry.geom_type, "MultiPolygon")
        self.assertEqual(ensure_multipolygon(polygon).geom_type, "MultiPolygon")


class OceanSstLatestOnlyTests(unittest.TestCase):
    def test_clamps_to_source_latest_date(self):
        now = datetime(2026, 6, 17, 14, tzinfo=timezone.utc)
        source_latest = datetime(2026, 6, 15, 12, tzinfo=timezone.utc)

        _start, end = query_window(now, source_latest)

        self.assertEqual(end, source_latest)

    def test_keeps_latest_valid_area_average_only(self):
        payload = {
            "table": {
                "columnNames": ["time", "latitude", "longitude", "analysed_sst"],
                "rows": [
                    ["2026-06-14T12:00:00Z", -19.0, 190.1, 27.0],
                    ["2026-06-15T12:00:00Z", -19.0, 190.1, 27.5],
                    ["2026-06-15T12:00:00Z", -19.0, 190.2, 28.0],
                    ["2026-06-15T12:00:00Z", -19.1, 190.2, None],
                ],
            }
        }

        record = latest_valid_record("niue", payload)

        self.assertEqual(record["recorded_date"], "2026-06-15")
        self.assertEqual(record["value"], 27.75)


class WmipCurrentParsingTests(unittest.TestCase):
    def test_reads_current_station_id_shape(self):
        self.assertEqual(station_id({"station": "143001C"}), "143001C")

    def test_extracts_latest_numeric_from_trace_rows(self):
        self.assertEqual(
            latest_numeric_value([["2026-06-17T00:00:00Z", 1.2], ["2026-06-17T01:00:00Z", 1.4]]),
            1.4,
        )


if __name__ == "__main__":
    unittest.main()
