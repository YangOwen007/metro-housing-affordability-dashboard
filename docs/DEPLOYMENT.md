# Deployment guide

## Supported runtime and first deployment

Use Node.js 22 or 24, pnpm 10.17.1 and Next.js's Node runtime (not static export or Edge). The build generates Prisma Client and bundles the committed JSON through explicit file tracing. Python is not required on the web host.

Local production verification:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm audit --audit-level high
pnpm build
pnpm start
```

Set `DATA_SOURCE_MODE=file` explicitly if your local env contains an old auto/database setting. In PowerShell: `$env:DATA_SOURCE_MODE='file'`. On Linux/macOS: `export DATA_SOURCE_MODE=file`.

## Vercel setup

This is a documented deployment target, not an already-provisioned account. Follow [Vercel's Next.js documentation](https://vercel.com/docs/frameworks/full-stack/nextjs).

1. Sign in to your own Vercel account and import `YangOwen007/metro-housing-affordability-dashboard`.
2. Select Next.js, root directory `.`, Node.js 22, install command `pnpm install --frozen-lockfile`, build command `pnpm build`, default output settings.
3. Set `DATA_SOURCE_MODE=file` for Preview and Production. Leave `DATABASE_URL` and `CENSUS_API_KEY` unset for this mode.
4. Create a preview deployment, inspect the dashboard and endpoints below, then promote only after resolving security checks. Review the provider's costs and quotas before enabling paid services.

No domain is necessary for a provider preview URL. Set a README demo link/homepage only after the URL actually works. Self-hosting instead requires `pnpm start`, a TLS reverse proxy, process restarts, and host-level limits; this repo does not provision those.

## Post-deploy verification

Replace `YOUR_HOST` with the actual deployment URL:

```sh
curl --fail https://YOUR_HOST/api/health
curl --fail https://YOUR_HOST/api/dashboard
curl -I https://YOUR_HOST/
```

PowerShell alternative: `Invoke-RestMethod https://YOUR_HOST/api/health`.

Health must return 200, `ok: true`, `resolvedSource: file`, and four regions. Confirm API dates/metrics, change each chart metric and year range, compare different metros, and test keyboard controls and a narrow mobile viewport. Headers should include `X-Content-Type-Options: nosniff` and frame protection. Do not accept a green build alone as proof of working runtime data.

## Optional PostgreSQL deployment

Provision a separate hosted database for production and one for previews. Use the provider's TLS URL and suitable connection pooling/timeouts. Do not expose port 5432 publicly or use the local example password. Keep write/migration credentials restricted; use a read-only role for the web app when the provider supports it.

Before switching to `DATA_SOURCE_MODE=database`, run from an authorized environment with the production URL:

```sh
pnpm db:generate
pnpm db:migrate
pnpm db:import
```

The initial migration is intended for an empty database. For an existing database made using `db:push`, back it up, compare its schema against `prisma/schema.prisma`, and only if identical mark the baseline applied:

```sh
node scripts/run_prisma_command.mjs migrate resolve --applied 20261006000000_initial
pnpm db:migrate
```

Never reset a production database to resolve migration history. The repository does not execute migrations during web builds. Switch data mode, redeploy, and confirm `/api/health` reports `database`. Failed or empty imports must produce 503, not file fallback. `updatedAt` means successful import time in this mode. The import does not delete old rows, so changing the tracked metro/year set requires a separate retention decision.

## Refreshes, operations, and recovery

For the file workflow, add `CENSUS_API_KEY` under GitHub repository Settings -> Secrets and variables -> Actions. Permit Actions to write repository contents if your policy allows it; branch protection may require a PR-based refresh instead. Trigger the workflow manually once and inspect the resulting data commit. It queries the fixed 2021-2024 window weekly, not the newest available year. It does not import into PostgreSQL. Verify a provider rebuild occurred after a data change; otherwise manually redeploy.

Monitor `/api/health` and server errors. `auto` logs a generic fallback event; use strict `database` mode when database availability is required. Public read routes have no in-app rate limiter; configure request limits on the hosting platform as needed.

For database operations, enable provider backups before deployment and test restoring to a separate database. This has not been performed by this repository. Roll back web code using a previous verified provider deployment or a normal Git revert/redeploy. File data rolls back with code; database data does not, so restore from a verified backup or reimport a reviewed artifact. Do not change schema destructively as part of a rollback.

Common failures: missing artifact (check build tracing and committed files), invalid mode (fix spelling), missing Prisma Client (run build/generate), 503 database mode (check TLS, network, migrations and successful import), refresh failure (check Census secret/connectivity without printing it). `deploy:check` validates local configuration only; it does not check remote secrets, account permissions, billing, backups, or connectivity.
