import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { hasProjectEnvFile, loadProjectEnv } from "./env-utils.mjs";

// This script focuses on deployment assumptions rather than local development setup.
const projectRoot = process.cwd();
const processedDatasetPath = path.join(projectRoot, "data", "processed", "housing_dashboard_sample.json");

loadProjectEnv(projectRoot);

function hasRealValue(value, placeholders) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  return !placeholders.includes(normalizedValue);
}

const dataSourceMode = (process.env.DATA_SOURCE_MODE ?? "auto").trim().toLowerCase();
const deployChecks = [
  {
    label: "Environment file present",
    ok: hasProjectEnvFile(projectRoot),
    fix: "Create .env.local locally and configure matching production secrets on your host."
  },
  {
    label: "Processed dataset committed",
    ok: existsSync(processedDatasetPath),
    fix: "Run pnpm data:refresh so the app has a safe fallback dataset."
  },
  {
    label: "DATA_SOURCE_MODE set intentionally",
    ok: ["auto", "database", "file"].includes(dataSourceMode),
    fix: "Set DATA_SOURCE_MODE to auto, database, or file in your deployment environment."
  },
  {
    label: "Database URL ready when database mode is used",
    ok:
      dataSourceMode !== "database" ||
      hasRealValue(process.env.DATABASE_URL, [
        "postgresql://postgres:postgres@localhost:5432/housing_dashboard"
      ]),
    fix: "Provide a hosted PostgreSQL DATABASE_URL before deploying with DATA_SOURCE_MODE=database."
  },
  {
    label: "Census key ready for scheduled refresh",
    ok: hasRealValue(process.env.CENSUS_API_KEY, ["your-census-api-key"]),
    fix: "Add CENSUS_API_KEY as a GitHub Actions secret so scheduled refreshes can run."
  }
];

for (const check of deployChecks) {
  console.log(`${check.ok ? "PASS" : "TODO"}  ${check.label}`);

  if (!check.ok) {
    console.log(`      ${check.fix}`);
  }
}

console.log(`INFO  Current DATA_SOURCE_MODE: ${dataSourceMode || "auto"}`);
