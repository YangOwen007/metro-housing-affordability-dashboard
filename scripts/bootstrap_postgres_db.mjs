import { PrismaClient } from "@prisma/client";
import { loadProjectEnv } from "./env-utils.mjs";

// Load the same local env file the rest of the project uses.
loadProjectEnv();

const configuredUrl = process.env.DATABASE_URL;

if (!configuredUrl) {
  console.error("DATABASE_URL is required before bootstrapping the PostgreSQL database.");
  process.exit(1);
}

const targetUrl = new URL(configuredUrl);
const targetDatabaseName = targetUrl.pathname.replace(/^\//, "");

if (!targetDatabaseName) {
  console.error("DATABASE_URL must include a database name in the path.");
  process.exit(1);
}

// Postgres exposes a default maintenance database named `postgres`; we connect there
// first so we can create the app database if it does not exist yet.
const adminUrl = new URL(configuredUrl);
adminUrl.pathname = "/postgres";
process.env.DATABASE_URL = adminUrl.toString();

const prisma = new PrismaClient({ log: [] });

async function main() {
  await prisma.$connect();

  const existingDatabase = await prisma.$queryRawUnsafe(
    "SELECT datname FROM pg_database WHERE datname = $1",
    targetDatabaseName
  );

  if (Array.isArray(existingDatabase) && existingDatabase.length > 0) {
    console.log(`Database ${targetDatabaseName} already exists.`);
    return;
  }

  // We quote the identifier manually because CREATE DATABASE cannot use a normal bind parameter for identifiers.
  const safeDatabaseName = targetDatabaseName.replace(/"/g, "\"\"");
  await prisma.$executeRawUnsafe(`CREATE DATABASE "${safeDatabaseName}"`);
  console.log(`Created database ${targetDatabaseName}.`);
}

main()
  .catch(() => {
    // Maintenance errors can include connection details; keep terminal output generic.
    console.error("Database bootstrap failed. Check local database access and CREATE DATABASE permission.");
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });
