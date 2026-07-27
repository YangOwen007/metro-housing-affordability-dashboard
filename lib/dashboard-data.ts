import type {
  DashboardDataset,
  DashboardInsight,
  MetricKey,
  MetricObservation,
  RegionRecord
} from "@/types/dashboard";

// A single source of truth for labels keeps the UI and charts consistent.
export const metricConfig: Record<
  MetricKey,
  { label: string; color: string; formatter: (value: number) => string }
> = {
  medianRent: {
    label: "Median Rent",
    color: "#ff7a18",
    formatter: (value) => `$${Math.round(value).toLocaleString()}`
  },
  medianHomeValue: {
    label: "Median Home Value",
    color: "#0077b6",
    formatter: (value) => `$${Math.round(value).toLocaleString()}`
  },
  medianIncome: {
    label: "Median Income",
    color: "#0f9d58",
    formatter: (value) => `$${Math.round(value).toLocaleString()}`
  },
  vacancyRate: {
    label: "Vacancy Rate",
    color: "#7a3cff",
    formatter: (value) => `${value.toFixed(1)}%`
  },
  affordabilityPressure: {
    label: "Rent Burden",
    color: "#d9485f",
    formatter: (value) => `${value.toFixed(1)}%`
  }
};

// Reusing the same chart colors across the comparison UI makes the selected markets easier to track visually.
export const comparisonPalette = ["#ff7a18", "#0077b6", "#0f9d58", "#7a3cff"];

// Grouping observations by region makes it easier to drive comparison UI and KPI summaries.
export function getObservationsForRegion(dataset: DashboardDataset, regionId: string) {
  return dataset.observations
    .filter((observation) => observation.regionId === regionId)
    .sort((left, right) => left.date.localeCompare(right.date));
}

// We derive the available year list from the data itself so filters stay aligned with the current source window.
export function getAvailableYears(dataset: DashboardDataset) {
  return Array.from(
    new Set(
      dataset.observations.map((observation) => new Date(observation.date).getFullYear())
    )
  ).sort((left, right) => left - right);
}

// Date range filtering is shared between the chart and summary components to keep their stories in sync.
export function filterObservationsByYearRange(
  observations: MetricObservation[],
  startYear: number,
  endYear: number
) {
  return observations.filter((observation) => {
    const observationYear = new Date(observation.date).getFullYear();

    return observationYear >= startYear && observationYear <= endYear;
  });
}

// The chart wants rows grouped by year, with one column per selected region.
export function buildComparisonSeries(
  dataset: DashboardDataset,
  regionIds: string[],
  startYear: number,
  endYear: number,
  metric: MetricKey
) {
  const regionNames = new Map(dataset.regions.map((region) => [region.id, region.name]));
  const rowsByYear = new Map<number, Record<string, number | string>>();

  for (const regionId of regionIds) {
    const filteredObservations = filterObservationsByYearRange(
      getObservationsForRegion(dataset, regionId),
      startYear,
      endYear
    );

    for (const observation of filteredObservations) {
      const year = new Date(observation.date).getFullYear();
      const currentRow = rowsByYear.get(year) ?? { year: year.toString() };
      currentRow[regionId] = observation[metric];
      currentRow[`${regionId}Label`] = regionNames.get(regionId) ?? regionId;
      rowsByYear.set(year, currentRow);
    }
  }

  return Array.from(rowsByYear.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, row]) => row);
}

// We use a simple first-vs-last comparison to keep the KPI story easy to understand.
export function getMetricChange(
  dataset: DashboardDataset,
  regionId: string,
  metric: MetricKey,
  startYear?: number,
  endYear?: number
) {
  const observations =
    startYear !== undefined && endYear !== undefined
      ? filterObservationsByYearRange(getObservationsForRegion(dataset, regionId), startYear, endYear)
      : getObservationsForRegion(dataset, regionId);
  const first = observations.at(0);
  const last = observations.at(-1);

  if (!first || !last) {
    return null;
  }

  const start = first[metric];
  const end = last[metric];
  const absoluteChange = end - start;
  const percentChange = start === 0 ? 0 : (absoluteChange / start) * 100;

  return {
    start,
    end,
    absoluteChange,
    percentChange
  };
}

// Many dashboard panels need "the latest point in the filtered range", so we centralize that lookup.
export function getLatestObservationInRange(
  dataset: DashboardDataset,
  regionId: string,
  startYear: number,
  endYear: number
) {
  return filterObservationsByYearRange(getObservationsForRegion(dataset, regionId), startYear, endYear).at(-1);
}

// We compute insight cards from the latest normalized observations so file-backed and DB-backed modes match.
export function buildInsights(
  regions: RegionRecord[],
  observations: MetricObservation[]
): DashboardInsight[] {
  const latestByRegion = regions
    .map((region) => {
      const latest = observations
        .filter((observation) => observation.regionId === region.id)
        .sort((left, right) => left.date.localeCompare(right.date))
        .at(-1);

      return latest ? { region, latest } : null;
    })
    .filter(Boolean) as Array<{ region: RegionRecord; latest: MetricObservation }>;

  if (latestByRegion.length === 0) {
    return [];
  }

  const highestRentBurden = [...latestByRegion].sort(
    (left, right) => right.latest.affordabilityPressure - left.latest.affordabilityPressure
  )[0];
  const fastestIncomeGrowth = [...regions]
    .map((region) => {
      const series = observations
        .filter((observation) => observation.regionId === region.id)
        .sort((left, right) => left.date.localeCompare(right.date));
      const first = series.at(0);
      const last = series.at(-1);

      if (!first || !last) {
        return null;
      }

      return {
        region,
        change: ((last.medianIncome - first.medianIncome) / first.medianIncome) * 100
      };
    })
    .filter(Boolean)
    .sort((left, right) => right!.change - left!.change)[0];
  const tightestVacancy = [...latestByRegion].sort(
    (left, right) => left.latest.vacancyRate - right.latest.vacancyRate
  )[0];

  return [
    {
      id: "highest-rent-burden",
      title: `${highestRentBurden.region.name} has the highest current rent burden in this metro set.`,
      detail: `Its latest estimated rent burden is ${highestRentBurden.latest.affordabilityPressure.toFixed(1)}% of median household income, which helps translate raw rent and income values into an affordability story.`
    },
    {
      id: "fastest-income-growth",
      title: `${fastestIncomeGrowth?.region.name ?? "One market"} shows the strongest income growth across the current ACS window.`,
      detail: `Using first-versus-last comparisons on the normalized yearly records is a clean example of how analytics layers can sit on top of one shared source table.`
    },
    {
      id: "tightest-vacancy",
      title: `${tightestVacancy.region.name} currently has the tightest housing vacancy rate among the tracked metros.`,
      detail: `Vacancy rate is a more honest ACS-backed supply signal for this MVP than "active inventory," which would require a different source family such as Zillow listings data.`
    }
  ];
}
