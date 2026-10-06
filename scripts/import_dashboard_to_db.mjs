import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { loadProjectEnv } from "./env-utils.mjs";
import { validateDataset } from "./validate_dataset.mjs";

loadProjectEnv();
const prisma = new PrismaClient({ log: [] });

async function main() {
  let refreshRun;
  try {
    // Validate the complete handoff before creating audit records or changing observations.
    const dataset = JSON.parse(await readFile("data/processed/housing_dashboard_sample.json", "utf8"));
    validateDataset(dataset);
    refreshRun = await prisma.refreshRun.create({ data: {
      sourceName: "census-acs-normalized-json", runStatus: "running", startedAt: new Date()
    } });
    await prisma.$transaction(async (transaction) => {
      // Region/date uniqueness makes repeated imports idempotent for the time series.
      for (const region of dataset.regions) {
        await transaction.region.upsert({ where: { id: region.id }, update: region, create: region });
      }
      for (const { date, ...values } of dataset.observations) {
        const observationDate = new Date(date);
        await transaction.metricObservation.upsert({
          where: { regionId_observationDate: { regionId: values.regionId, observationDate } },
          update: values, create: { ...values, observationDate }
        });
      }
      // The success marker commits with the data; readers never report a partial import as successful.
      await transaction.refreshRun.update({ where: { id: refreshRun.id }, data: {
        runStatus: "success", finishedAt: new Date(),
        notes: `Imported ${dataset.regions.length} regions and ${dataset.observations.length} observations.`
      } });
    }, { timeout: 30000 });
    console.log("Imported processed dashboard data into PostgreSQL.");
  } catch {
    if (refreshRun) {
      await prisma.refreshRun.update({ where: { id: refreshRun.id }, data: {
        runStatus: "failed", finishedAt: new Date(), notes: "Import failed; observation changes rolled back."
      } }).catch(() => {});
    }
    // Do not persist or print raw database exceptions that can contain credentials.
    console.error("Import failed. Check dataset validity, database access, and migrations.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
await main();
