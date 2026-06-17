import unittest

from ingest_bcc_flood import polygonal_geometry, resolve_flood_class
from ingest_pdh_stat import parse_population_records
from ingest_qld_2011 import ensure_multipolygon


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


if __name__ == "__main__":
    unittest.main()
