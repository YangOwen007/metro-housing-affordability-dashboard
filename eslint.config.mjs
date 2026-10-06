import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// Reuse Next's rules while exposing lint as a standalone CI command.
const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url)),
  resolvePluginsRelativeTo: path.dirname(require.resolve("eslint-config-next/package.json"))
});
const config = [
  { ignores: [".next/**", "node_modules/**", ".test-build/**", ".review-checkout/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals")
];
export default config;
