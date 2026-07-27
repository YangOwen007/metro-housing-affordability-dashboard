import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// These are the env files we support for local development, in override order.
const ENV_FILE_NAMES = [".env", ".env.local"];

function parseEnvLine(line) {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf("=");

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  let value = trimmedLine.slice(separatorIndex + 1).trim();

  // Remove matching quotes so users can copy values directly from examples.
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

// Load environment variables into process.env without overriding existing shell values.
export function loadProjectEnv(projectRoot = process.cwd()) {
  for (const fileName of ENV_FILE_NAMES) {
    const filePath = path.join(projectRoot, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    const fileContents = readFileSync(filePath, "utf8");

    for (const line of fileContents.split(/\r?\n/)) {
      const parsedLine = parseEnvLine(line);

      if (!parsedLine || process.env[parsedLine.key]) {
        continue;
      }

      process.env[parsedLine.key] = parsedLine.value;
    }
  }
}

// A small helper keeps setup checks readable in the scripts that call it.
export function hasProjectEnvFile(projectRoot = process.cwd()) {
  return ENV_FILE_NAMES.some((fileName) => existsSync(path.join(projectRoot, fileName)));
}
