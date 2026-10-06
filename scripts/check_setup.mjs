import { readFileSync } from "node:fs";
import { loadProjectEnv } from "./env-utils.mjs";
import { validateDataset } from "./validate_dataset.mjs";

// Running the dashboard and refreshing it have different prerequisites.
loadProjectEnv();
try {
  const dataset = JSON.parse(readFileSync("data/processed/housing_dashboard_sample.json", "utf8"));
  validateDataset(dataset);
  console.log(`PASS Committed dataset: ${dataset.regions.length} metros, ${dataset.observations.length} observations.`);
} catch {
  console.error("FAIL Committed dataset is missing or invalid.");
  process.exitCode = 1;
}
console.log(`INFO Data mode: ${process.env.DATA_SOURCE_MODE || "file"}`);
console.log(`INFO Census refresh key: ${process.env.CENSUS_API_KEY ? "configured locally (not verified)" : "optional; not configured"}`);
console.log(`INFO Database URL: ${process.env.DATABASE_URL ? "configured locally (not verified)" : "optional; not configured"}`);
