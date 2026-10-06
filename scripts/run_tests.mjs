import { spawnSync } from "node:child_process";

// Compile pure TypeScript helpers to a disposable directory; no test framework required.
const compile = spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tests/tsconfig.json"], { stdio: "inherit" });
if (compile.status !== 0) process.exit(compile.status ?? 1);
const tests = spawnSync(process.execPath, ["--test", "tests/dashboard.test.mjs"], { stdio: "inherit" });
process.exitCode = tests.status ?? 1;
