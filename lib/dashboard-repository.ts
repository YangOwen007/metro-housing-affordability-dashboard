import { promises as fs } from "node:fs";
import path from "node:path";
import { buildInsights } from "@/lib/dashboard-data";
import { getDataSourceMode } from "@/lib/runtime-config";
import type { DashboardDataset, MetricObservation, RegionRecord } from "@/types/dashboard";

const datasetPath = path.join(process.cwd(), "data", "processed", "housing_dashboard_sample.json");

type PrismaRegionRecord = {
  id: string;
  cbsaCode: string;
  name: string;
  state: string;
  populationLabel: string;
  observations: Array<{
    observationDate: Date;
    medianRent: number;
    medianHomeValue: number;
    medianIncome: number;
    vacancyRate: number;
    affordabilityPressure: number;
  }>;
};

// We keep file loading separate so the app still works before a database is configured.
async function readFileDataset(): Promise<DashboardDataset> {
  const rawText = await fs.readFile(datasetPath, "utf8");
  const parsed = JSON.parse(rawText) as DashboardDataset;

  return {
    ...parsed,
    insights: parsed.insights?.length ? parsed.insights : buildInsights(parsed.regions, parsed.observations)
  };
}

// Dynamic import avoids crashing local development when Prisma Client has not been generated yet.
async function readDatabaseDataset(): Promise<DashboardDataset | null> {
  const dataSourceMode = getDataSourceMode();

  if (!process.env.DATABASE_URL) {
    if (dataSourceMode === "database") {
      throw new Error("DATA_SOURCE_MODE=database requires DATABASE_URL to be configured.");
    }

    return null;
  }

  try {
    const prismaModule = (await import("@prisma/client")) as {
      PrismaClient?: new (...args: unknown[]) => {
        region: {
          findMany: (args: unknown) => Promise<unknown>;
        };
      };
      default?: {
        PrismaClient?: new (...args: unknown[]) => {
          region: {
            findMany: (args: unknown) => Promise<unknown>;
          };
        };
      };
    };
    const PrismaClient =
      prismaModule.PrismaClient ?? prismaModule.default?.PrismaClient;

    if (!PrismaClient) {
      return null;
    }

    const globalForPrisma = globalThis as typeof globalThis & {
      prisma?: InstanceType<typeof PrismaClient>;
    };
    const prisma =
      globalForPrisma.prisma ??
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
      });

    globalForPrisma.prisma = prisma;

    const regions = (await prisma.region.findMany({
      include: {
        observations: {
          orderBy: {
            observationDate: "asc"
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    })) as PrismaRegionRecord[];

    if (regions.length === 0) {
      return null;
    }

    const mappedRegions: RegionRecord[] = regions.map((region) => ({
      id: region.id,
      cbsaCode: region.cbsaCode,
      name: region.name,
      state: region.state,
      populationLabel: region.populationLabel
    }));

    const observations: MetricObservation[] = regions.flatMap((region) =>
      region.observations.map((observation) => ({
        regionId: region.id,
        date: observation.observationDate.toISOString(),
        medianRent: observation.medianRent,
        medianHomeValue: observation.medianHomeValue,
        medianIncome: observation.medianIncome,
        vacancyRate: observation.vacancyRate,
        affordabilityPressure: observation.affordabilityPressure
      }))
    );

    return {
      updatedAt: new Date().toISOString(),
      source: "PostgreSQL via Prisma (loaded from Census ACS pipeline output)",
      regions: mappedRegions,
      observations,
      insights: buildInsights(mappedRegions, observations)
    };
  } catch (error) {
    if (dataSourceMode === "database") {
      throw error;
    }

    console.warn("Falling back to the file dataset because the database is not ready yet.", error);
    return null;
  }
}

// This repository function gives both the page and API route one consistent read path.
export async function getDashboardDataset(): Promise<DashboardDataset> {
  const databaseDataset = await readDatabaseDataset();

  if (databaseDataset) {
    return databaseDataset;
  }

  return readFileDataset();
}

// Health and deployment checks need a lightweight way to inspect which source actually resolved.
export async function resolveDashboardDataSource() {
  const databaseDataset = await readDatabaseDataset();

  if (databaseDataset) {
    return {
      dataset: databaseDataset,
      resolvedSource: "database" as const
    };
  }

  return {
    dataset: await readFileDataset(),
    resolvedSource: "file" as const
  };
}
