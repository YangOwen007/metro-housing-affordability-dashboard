import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { loadProjectEnv } from "../scripts/env-utils.mjs";

loadProjectEnv();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required for isolated database tests.");
// Only the temporary schema is mutated; existing application tables remain untouched.
const schema = `review_test_${randomUUID().replaceAll("-", "")}`;
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set("schema", schema);
url.searchParams.set("connect_timeout", "5");
url.searchParams.set("pool_timeout", "5");
const env = { ...process.env, DATABASE_URL: url.toString() };
const prisma = new PrismaClient({ datasourceUrl: url.toString(), log: [] });
function run(args) {
  const result = spawnSync(process.execPath, args, { env, encoding: "utf8", timeout: 60000 });
  // Capture child output rather than logging connection details on errors.
  assert.equal(result.status, 0, `Database test command failed: ${args[0]}`);
}
try {
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  run(["scripts/import_dashboard_to_db.mjs"]);
  run(["scripts/import_dashboard_to_db.mjs"]);
  assert.equal(await prisma.region.count(), 4);
  assert.equal(await prisma.metricObservation.count(), 16);
  assert.equal(await prisma.refreshRun.count({ where: { runStatus: "success" } }), 2);
  console.log("PASS Isolated PostgreSQL migration and repeated import: 4 regions, 16 observations, 2 successful runs.");
} catch {
  console.error("FAIL Isolated database verification; check database access, migrations and import commands.");
  process.exitCode = 1;
} finally {
  // The generated identifier contains only letters, digits and underscores.
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => {});
  await prisma.$disconnect();
}
