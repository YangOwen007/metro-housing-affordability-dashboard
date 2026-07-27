"""Fetch, normalize, and persist metro housing affordability data.

This script pulls official yearly housing and income estimates from the U.S.
Census ACS API, reshapes them into one dashboard-friendly contract, and writes
both raw snapshots and a processed artifact that the app or database importer
can consume.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from json import JSONDecodeError
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen


ACS_VARIABLES = {
    "median_rent": "B25064_001E",
    "median_home_value": "B25077_001E",
    "median_income": "B19013_001E",
    "total_units": "B25002_001E",
    "vacant_units": "B25002_003E",
}
ACS_YEARS = [2021, 2022, 2023, 2024]


@dataclass(frozen=True)
class MetroConfig:
    """Metadata for each tracked metro area."""

    id: str
    cbsa_code: str
    name: str
    state: str
    population_label: str


METROS = [
    MetroConfig("austin-tx", "12420", "Austin", "TX", "Large metro"),
    MetroConfig("miami-fl", "33100", "Miami", "FL", "Large metro"),
    MetroConfig("san-diego-ca", "41740", "San Diego", "CA", "Large metro"),
    MetroConfig("seattle-wa", "42660", "Seattle", "WA", "Large metro"),
]


def load_local_env(project_root: Path) -> None:
    """Load simple KEY=VALUE pairs from .env and .env.local into os.environ."""

    for file_name in [".env", ".env.local"]:
        file_path = project_root / file_name

        if not file_path.exists():
            continue

        for line in file_path.read_text(encoding="utf-8").splitlines():
            stripped_line = line.strip()

            if not stripped_line or stripped_line.startswith("#") or "=" not in stripped_line:
                continue

            key, value = stripped_line.split("=", 1)
            cleaned_value = value.strip().strip('"').strip("'")
            os.environ.setdefault(key.strip(), cleaned_value)


def fetch_json(url: str) -> Any:
    """Fetch JSON from a public API using only the Python standard library."""

    with urlopen(url) as response:  # noqa: S310 - this is an expected HTTPS API fetch.
        payload = response.read().decode("utf-8")

    try:
        return json.loads(payload)
    except JSONDecodeError as error:
        preview = payload[:300].replace("\n", " ")
        raise RuntimeError(f"Expected JSON from the ACS API but received: {preview}") from error


def build_acs_url(year: int, cbsa_code: str, api_key: str | None) -> str:
    """Construct one ACS query URL for a single metro and year."""

    query = {
        "get": ",".join(["NAME", *ACS_VARIABLES.values()]),
        "for": f"metropolitan statistical area/micropolitan statistical area:{cbsa_code}",
    }

    if api_key:
        query["key"] = api_key

    return f"https://api.census.gov/data/{year}/acs/acs1?{urlencode(query)}"


def parse_census_value(raw_value: str) -> float:
    """Convert ACS numeric strings into floats and guard against missing sentinels."""

    if raw_value in {"-666666666", "-222222222", "null"}:
        raise ValueError(f"Encountered missing ACS value: {raw_value}")

    return float(raw_value)


def build_affordability_pressure(median_rent: float, median_income: float) -> float:
    """Estimate rent burden as annual rent divided by annual household income."""

    annual_rent = median_rent * 12
    return round((annual_rent / median_income) * 100, 2)


def build_insights(regions: list[dict[str, Any]], observations: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Turn the latest normalized values into a few human-readable takeaways."""

    latest_by_region = []

    for region in regions:
      series = sorted(
          [record for record in observations if record["regionId"] == region["id"]],
          key=lambda record: record["date"],
      )

      if series:
          latest_by_region.append({"region": region, "latest": series[-1], "first": series[0]})

    highest_burden = max(latest_by_region, key=lambda item: item["latest"]["affordabilityPressure"])
    fastest_income_growth = max(
        latest_by_region,
        key=lambda item: item["latest"]["medianIncome"] - item["first"]["medianIncome"],
    )
    tightest_vacancy = min(latest_by_region, key=lambda item: item["latest"]["vacancyRate"])

    return [
        {
            "id": "highest-rent-burden",
            "title": f'{highest_burden["region"]["name"]} has the highest current rent burden in the tracked metros.',
            "detail": (
                f'Its latest rent burden is {highest_burden["latest"]["affordabilityPressure"]:.1f}% of median '
                "household income, which makes the affordability story easier to interpret than raw rent alone."
            ),
        },
        {
            "id": "fastest-income-growth",
            "title": f'{fastest_income_growth["region"]["name"]} shows the strongest income increase across the current ACS window.',
            "detail": (
                "This is a good example of how normalized yearly observations let you compute trends without "
                "changing the source fetch logic."
            ),
        },
        {
            "id": "tightest-vacancy",
            "title": f'{tightest_vacancy["region"]["name"]} currently has the tightest vacancy rate in this metro set.',
            "detail": (
                "Vacancy rate is an honest ACS-backed supply signal for the MVP, while active listing inventory "
                "would require an additional source family."
            ),
        },
    ]


def main() -> None:
    """Fetch raw data, normalize it, and write both raw and processed artifacts."""

    project_root = Path(__file__).resolve().parent.parent
    load_local_env(project_root)
    api_key = os.getenv("CENSUS_API_KEY")

    if not api_key:
        raise RuntimeError(
            "CENSUS_API_KEY is required for live ACS requests. Add it to .env.local before running pnpm data:refresh."
        )

    raw_directory = project_root / "data" / "raw" / "acs"
    processed_path = project_root / "data" / "processed" / "housing_dashboard_sample.json"
    raw_directory.mkdir(parents=True, exist_ok=True)
    processed_path.parent.mkdir(parents=True, exist_ok=True)

    regions = [
        {
            "id": metro.id,
            "cbsaCode": metro.cbsa_code,
            "name": metro.name,
            "state": metro.state,
            "populationLabel": metro.population_label,
        }
        for metro in METROS
    ]
    observations: list[dict[str, Any]] = []

    for year in ACS_YEARS:
        year_rows = []

        for metro in METROS:
            url = build_acs_url(year, metro.cbsa_code, api_key)
            response_rows = fetch_json(url)
            header, values = response_rows[0], response_rows[1]
            row = dict(zip(header, values, strict=True))
            year_rows.append(row)

            median_rent = parse_census_value(row[ACS_VARIABLES["median_rent"]])
            median_home_value = parse_census_value(row[ACS_VARIABLES["median_home_value"]])
            median_income = parse_census_value(row[ACS_VARIABLES["median_income"]])
            total_units = parse_census_value(row[ACS_VARIABLES["total_units"]])
            vacant_units = parse_census_value(row[ACS_VARIABLES["vacant_units"]])
            vacancy_rate = round((vacant_units / total_units) * 100, 2)

            observations.append(
                {
                    "regionId": metro.id,
                    "date": f"{year}-01-01T00:00:00.000Z",
                    "medianRent": round(median_rent, 2),
                    "medianHomeValue": round(median_home_value, 2),
                    "medianIncome": round(median_income, 2),
                    "vacancyRate": vacancy_rate,
                    "affordabilityPressure": build_affordability_pressure(median_rent, median_income),
                }
            )

        # Keeping raw snapshots is useful for debugging and for showing the "raw to clean" story in GitHub.
        raw_output_path = raw_directory / f"acs_metro_snapshot_{year}.json"
        with raw_output_path.open("w", encoding="utf-8") as raw_output_file:
            json.dump(year_rows, raw_output_file, indent=2)
            raw_output_file.write("\n")

    processed_dataset = {
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "U.S. Census ACS 1-year estimates (2021-2024 metro snapshots)",
        "regions": regions,
        "observations": observations,
        "insights": build_insights(regions, observations),
    }

    with processed_path.open("w", encoding="utf-8") as processed_output_file:
        json.dump(processed_dataset, processed_output_file, indent=2)
        processed_output_file.write("\n")

    print(f"Wrote normalized ACS dashboard data to {processed_path}")


if __name__ == "__main__":
    main()
