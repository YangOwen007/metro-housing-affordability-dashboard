// Shared types keep the frontend, API layer, and pipeline aligned on one contract.
export type MetricKey =
  | "medianRent"
  | "medianHomeValue"
  | "medianIncome"
  | "vacancyRate"
  | "affordabilityPressure";

export type RegionRecord = {
  id: string;
  cbsaCode: string;
  name: string;
  state: string;
  populationLabel: string;
};

export type MetricObservation = {
  regionId: string;
  date: string;
  medianRent: number;
  medianHomeValue: number;
  medianIncome: number;
  vacancyRate: number;
  affordabilityPressure: number;
};

export type DashboardInsight = {
  id: string;
  title: string;
  detail: string;
};

export type DashboardDataset = {
  updatedAt: string;
  source: string;
  regions: RegionRecord[];
  observations: MetricObservation[];
  insights: DashboardInsight[];
};
