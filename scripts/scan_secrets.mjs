import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

// Output only location/rule names, never a matching credential or source line.
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const rules = [
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["github-token", /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})/],
  ["aws-key", /\bAKIA[A-Z0-9]{16}\b/],
  ["census-key", /CENSUS_API_KEY\s*=\s*["']?[a-f0-9]{40}\b/],
  ["credential-url", /(?:postgresql|postgres|mysql):\/\/(?!postgres:postgres@localhost|USER:PASSWORD@HOST|dashboard_test:disposable_ci_password@localhost)[^\s"']+:[^\s"']+@/],
  ["openai-key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/]
];
const localSecrets = [];
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  const contents = readFileSync(file, "utf8");
  const census = contents.match(/^CENSUS_API_KEY\s*=\s*["']?([^\s"']+)/m)?.[1];
  if (census && census !== "your-census-api-key" && census.length >= 20) localSecrets.push(census);
}
let findings = 0;
let inspected = 0;
function scan(content, location) {
  inspected++;
  for (const [name, pattern] of rules) {
    if (pattern.test(content)) { console.error(`Potential secret: ${location} (${name})`); findings++; }
  }
  if (localSecrets.some((secret) => content.includes(secret))) {
    console.error(`Potential secret: ${location} (local credential match)`); findings++;
  }
}

// Include new review files, all reachable history blobs, and optional build output.
for (const file of git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean)) {
  if (existsSync(file)) scan(readFileSync(file, "utf8"), file);
}
for (const line of git("rev-list", "--objects", "--all").trim().split("\n")) {
  const [id, ...file] = line.split(" ");
  if (git("cat-file", "-t", id).trim() === "blob") scan(git("cat-file", "blob", id), `history:${id.slice(0, 8)} ${file.join(" ")}`);
}
function scanBuild(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "cache") scanBuild(file);
    else if (entry.isFile() && /\.(js|json|html|map|txt|log)$/.test(file)) scan(readFileSync(file, "utf8"), file);
  }
}
if (process.argv.includes("--build") && existsSync(".next")) scanBuild(".next");
console.log(`Secret scan: ${inspected} files/blobs checked; ${findings} potential findings. Heuristic coverage only.`);
process.exitCode = findings ? 1 : 0;
