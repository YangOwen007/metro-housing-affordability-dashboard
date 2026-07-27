import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadProjectEnv } from "./env-utils.mjs";

// Load DATABASE_URL from the same local env files used everywhere else in the project.
loadProjectEnv();

// This importer keeps the pipeline and database loosely coupled through one JSON handoff file.
const prisma = new PrismaClient();
const datasetPath = path.join(process.cwd(), "data", "processed", "housing_dashboard_sample.json");

async function main() {
  const startedAt = new Date();
  const refreshRun = await prisma.refreshRun.create({
    data: {
      sourceName: "census-acs-normalized-json",
      runStatus: "running",
      startedAt,
      notes: "Importing the latest processed dashboard artifact into PostgreSQL."
    }
  });

  try {
    const datasetText = await readFile(datasetPath, "utf8");
    const dataset = JSON.parse(datasetText);

    // Upserting regions first guarantees the observation relation targets exist.
    for (const region of dataset.regions) {
      await prisma.region.upsert({
        where: {
          id: region.id
        },
        update: {
          cbsaCode: region.cbsaCode,
          name: region.name,
          state: region.state,
          populationLabel: region.populationLabel
        },
        create: {
          id: region.id,
          cbsaCode: region.cbsaCode,
          name: region.name,
          state: region.state,
          populationLabel: region.populationLabel
        }
      });
    }

    // Each observation is keyed by region and date so refreshes can safely overwrite values.
    for (const observation of dataset.observations) {
      await prisma.metricObservation.upsert({
        where: {
          regionId_observationDate: {
            regionId: observation.regionId,
            observationDate: new Date(observation.date)
          }
        },
        update: {
          medianRent: observation.medianRent,
          medianHomeValue: observation.medianHomeValue,
          medianIncome: observation.medianIncome,
          vacancyRate: observation.vacancyRate,
          affordabilityPressure: observation.affordabilityPressure
        },
        create: {
          regionId: observation.regionId,
          observationDate: new Date(observation.date),
          medianRent: observation.medianRent,
          medianHomeValue: observation.medianHomeValue,
          medianIncome: observation.medianIncome,
          vacancyRate: observation.vacancyRate,
          affordabilityPressure: observation.affordabilityPressure
        }
      });
    }

    await prisma.refreshRun.update({
      where: {
        id: refreshRun.id
      },
      data: {
        runStatus: "success",
        finishedAt: new Date(),
        notes: `Imported ${dataset.regions.length} regions and ${dataset.observations.length} observations.`
      }
    });

    console.log("Imported processed dashboard data into PostgreSQL.");
  } catch (error) {
    await prisma.refreshRun.update({
      where: {
        id: refreshRun.id
      },
      data: {
        runStatus: "failed",
        finishedAt: new Date(),
        notes: error instanceof Error ? error.message : "Unknown import error"
      }
    });

    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
