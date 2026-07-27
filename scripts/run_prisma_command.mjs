import { spawn } from "node:child_process";
import path from "node:path";
import { loadProjectEnv } from "./env-utils.mjs";

// Prisma CLI needs DATABASE_URL, so we load the same local env files the app uses.
loadProjectEnv();

const prismaArgs = process.argv.slice(2);

if (prismaArgs.length === 0) {
  console.error("Usage: node scripts/run_prisma_command.mjs <prisma args...>");
  process.exit(1);
}

const prismaEntrypoint = path.join(
  process.cwd(),
  "node_modules",
  "prisma",
  "build",
  "index.js"
);

const childProcess = spawn(process.execPath, [prismaEntrypoint, ...prismaArgs], {
  stdio: "inherit",
  env: process.env
});

childProcess.on("exit", (code) => {
  process.exit(code ?? 1);
});
