"""Offline regression tests for ACS parsing, math, and request failure redaction."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import fetch_housing_data as pipeline


class PipelineTests(unittest.TestCase):
    def test_sentinels_and_non_finite_values_fail(self):
        for value in [None, "null", "-999999999", "-666666666", "NaN", "inf"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                pipeline.parse_census_value(value)
        self.assertEqual(pipeline.parse_census_value("1200"), 1200)

    def test_ratio_and_zero_denominator(self):
        self.assertEqual(pipeline.build_affordability_pressure(1500, 60000), 30)
        with self.assertRaises(ValueError):
            pipeline.build_affordability_pressure(1500, 0)

    def test_network_error_does_not_expose_url(self):
        with patch.object(pipeline, "urlopen", side_effect=URLError("private-key-in-url")):
            with self.assertRaises(RuntimeError) as caught:
                pipeline.fetch_json("https://api.census.gov/")
            self.assertNotIn("private-key", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
