// This module centralizes runtime env decisions so page routes and APIs stay consistent.
export type DataSourceMode = "auto" | "database" | "file";

const allowedModes: DataSourceMode[] = ["auto", "database", "file"];

function normalizeMode(rawValue: string | undefined): DataSourceMode {
  if (!rawValue) {
    return "auto";
  }

  const normalizedValue = rawValue.trim().toLowerCase() as DataSourceMode;
  return allowedModes.includes(normalizedValue) ? normalizedValue : "auto";
}

// Deployment environments benefit from an explicit switch, so we expose one shared parser here.
export function getDataSourceMode(): DataSourceMode {
  return normalizeMode(process.env.DATA_SOURCE_MODE);
}

// This helper keeps status routes and server components aligned on whether a DB should be available.
export function requiresDatabase() {
  return getDataSourceMode() === "database";
}
