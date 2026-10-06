export type DataSourceMode = "auto" | "database" | "file";

// Fail on typos instead of silently changing the production storage policy.
export function getDataSourceMode(rawValue = process.env.DATA_SOURCE_MODE): DataSourceMode {
  const mode = rawValue?.trim().toLowerCase() || "file";
  if (mode !== "auto" && mode !== "database" && mode !== "file") {
    throw new Error("DATA_SOURCE_MODE must be file, database, or auto.");
  }
  return mode;
}

// Keep source selection testable without connecting to a real database.
export async function resolveSource<T>(
  mode: DataSourceMode,
  readFile: () => Promise<T>,
  readDatabase: () => Promise<T>,
  onFallback: () => void = () => {}
): Promise<{ dataset: T; resolvedSource: "file" | "database" }> {
  if (mode !== "file") {
    try {
      return { dataset: await readDatabase(), resolvedSource: "database" };
    } catch (error) {
      if (mode === "database") throw error;
      onFallback();
    }
  }
  return { dataset: await readFile(), resolvedSource: "file" };
}
