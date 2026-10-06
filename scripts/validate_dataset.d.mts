import type { DashboardDataset } from "../types/dashboard";
export function validateDataset(dataset: unknown): asserts dataset is DashboardDataset;
