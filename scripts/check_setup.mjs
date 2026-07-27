import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { hasProjectEnvFile, loadProjectEnv } from "./env-utils.mjs";

// This script gives a quick, beginner-friendly setup report before running the live pipeline.
const projectRoot = process.cwd();
const processedDatasetPath = path.join(projectRoot, "data", "processed", "housing_dashboard_sample.json");

loadProjectEnv(projectRoot);

function hasRealValue(value) {
  if (!value) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();

  return ![
    "your-census-api-key",
    "postgresql://postgres:postgres@localhost:5432/housing_dashboard"
  ].includes(normalizedValue);
}

const checks = [
  {
    label: "Environment file present",
    ok: hasProjectEnvFile(projectRoot),
    fix: "Copy .env.example to .env.local."
  },
  {
    label: "CENSUS_API_KEY configured",
    ok: hasRealValue(process.env.CENSUS_API_KEY),
    fix: "Add your Census API key to .env.local so pnpm data:refresh can call ACS."
  },
  {
    label: "DATABASE_URL configured",
    ok: hasRealValue(process.env.DATABASE_URL),
    fix: "Add your PostgreSQL connection string to .env.local before Prisma commands."
  },
  {
    label: "Processed dataset exists",
    ok: existsSync(processedDatasetPath),
    fix: "Run pnpm data:refresh after your Census key is configured."
  }
];

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "TODO"}  ${check.label}`);

  if (!check.ok) {
    console.log(`      ${check.fix}`);
  }
}

if (existsSync(processedDatasetPath)) {
  const parsedDataset = JSON.parse(readFileSync(processedDatasetPath, "utf8"));
  console.log(`INFO  Current dataset source: ${parsedDataset.source}`);
  console.log(`INFO  Regions tracked: ${parsedDataset.regions.length}`);
}
