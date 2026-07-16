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

// Grouping observations by region makes it easier to drive comparison UI and KPI summaries.
export function getObservationsForRegion(dataset: DashboardDataset, regionId: string) {
  return dataset.observations
    .filter((observation) => observation.regionId === regionId)
    .sort((left, right) => left.date.localeCompare(right.date));
}

// We use a simple first-vs-last comparison to keep the KPI story easy to understand.
export function getMetricChange(dataset: DashboardDataset, regionId: string, metric: MetricKey) {
  const observations = getObservationsForRegion(dataset, regionId);
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
