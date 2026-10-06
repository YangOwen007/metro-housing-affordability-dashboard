import { promises as fs } from "node:fs";
import path from "node:path";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { buildInsights } from "@/lib/dashboard-data";
import { getDataSourceMode, resolveSource } from "@/lib/runtime-config";
import { validateDataset } from "@/scripts/validate_dataset.mjs";
import type { DashboardDataset } from "@/types/dashboard";

const datasetPath = path.join(process.cwd(), "data/processed/housing_dashboard_sample.json");

// Validate the stored artifact at the boundary; TypeScript cannot validate JSON.
async function readFileDataset(): Promise<DashboardDataset> {
  const parsed: unknown = JSON.parse(await fs.readFile(datasetPath, "utf8"));
  validateDataset(parsed);
  return { ...parsed, insights: buildInsights(parsed.regions, parsed.observations) };
}

// One client per process avoids exhausting connection pools during hot reloads.
async function readDatabaseDataset(): Promise<DashboardDataset> {
  if (!process.env.DATABASE_URL) throw new Error("Database connection is not configured.");
  const { PrismaClient } = await import("@prisma/client");
  const cache = globalThis as typeof globalThis & { prisma?: PrismaClientType };
  const prisma = cache.prisma ?? new PrismaClient({ log: [] });
  cache.prisma = prisma;
  const [regions, refresh] = await prisma.$transaction([
    prisma.region.findMany({
      include: { observations: { orderBy: { observationDate: "asc" } } },
      orderBy: { name: "asc" }
    }),
    prisma.refreshRun.findFirst({
      where: { runStatus: "success", finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" }
    })
  ]);
  if (!refresh?.finishedAt) throw new Error("Database has no successful import.");
  const dataset = {
    updatedAt: refresh.finishedAt.toISOString(),
    source: "U.S. Census ACS 1-year estimates (PostgreSQL import)",
    regions: regions.map(({ id, cbsaCode, name, state, populationLabel }) => ({
      id, cbsaCode, name, state, populationLabel
    })),
    observations: regions.flatMap((region) => region.observations.map(({ id: _id, observationDate, ...record }) => ({
      ...record, date: observationDate.toISOString()
    }))),
    insights: []
  };
  validateDataset(dataset);
  return { ...dataset, insights: buildInsights(dataset.regions, dataset.observations) };
}

// Explicit auto mode may fall back, but strict database mode never hides failure.
export function resolveDashboardDataSource() {
  return resolveSource(getDataSourceMode(), readFileDataset, async () => {
    try {
      return await readDatabaseDataset();
    } catch {
      // Server-rendering logs thrown errors; do not forward raw Prisma exceptions there either.
      throw new Error("Database data unavailable. Check connection, migrations and import status.");
    }
  }, () => {
    console.warn("dashboard_database_unavailable: serving committed dataset");
  });
}

export async function getDashboardDataset() {
  return (await resolveDashboardDataSource()).dataset;
}
