import { readFileSync } from "node:fs";
import { loadProjectEnv } from "./env-utils.mjs";
import { validateDataset } from "./validate_dataset.mjs";

// This is a local configuration check, not proof that a remote host is configured.
loadProjectEnv();
const mode = process.env.DATA_SOURCE_MODE?.trim().toLowerCase() || "file";
try {
  if (!["file", "database", "auto"].includes(mode)) throw new Error("Set DATA_SOURCE_MODE=file, database, or auto.");
  validateDataset(JSON.parse(readFileSync("data/processed/housing_dashboard_sample.json", "utf8")));
  if (mode === "database") {
    const url = new URL(process.env.DATABASE_URL || "");
    if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("PostgreSQL URL required.");
    if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new Error("A remote deployment cannot reach your local database.");
  }
  console.log(`PASS Local dataset and ${mode} configuration. Verify /api/health on the actual host.`);
  console.log("INFO Hosting account, production secrets, TLS, database connectivity and GitHub secrets are not verified here.");
} catch {
  console.error("FAIL Invalid dataset or deployment configuration. See docs/DEPLOYMENT.md.");
  process.exitCode = 1;
}
