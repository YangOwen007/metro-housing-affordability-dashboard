# Public review and deployment assessment

Reviewed October 6, 2026. Baseline: commit `356d237` on `main`, with a clean working tree. This assessment describes specific checks, not a security certification or a claim of employment readiness.

## Overall assessment

The project is a credible, small personal analytics dashboard once its behavior and limitations are described accurately. The committed dataset supports reproducible local and production runs. Hosting remains unprovisioned, and the dependency audit still fails on high-severity transitive advisories. Do not treat a successful build as approval for public deployment.

Three remaining concerns: dependency advisories, an unverified hosting/refresh integration, and limited statistical coverage (four metros, fixed 2021-2024 window, no margins of error or inflation adjustment).

## Findings before changes

| Severity / category | Evidence | Impact and disposition |
| --- | --- | --- |
| Critical / dependencies | Lockfile: Next.js 15.5.20; registry audit reported 2 critical, 21 high, 9 moderate advisories | Updated Next.js and matching lint config to 15.5.27; compatible transitive patches applied. Remaining issues below. |
| High / storage correctness | `lib/dashboard-repository.ts`: file mode still attempted DB; strict DB returned null for empty results | Mode policy now bypasses DB in file mode and fails closed in database mode, with regression tests. |
| High / error disclosure | `/api/health` returned raw exception messages | API errors now return generic 503 responses; no exception/connection text sent to clients. |
| High / reproducibility | `package.json` refresh command contained a developer-specific absolute Python path; refresh CI used npm with only pnpm lockfile | Portable Python command, pinned pnpm, frozen installs, Python-only refresh workflow and versioned migration added. |
| Medium / stale data | Production build prerendered `/`; repository stamped DB results with request time | Homepage/API read at request time; timestamp reflects artifact change or successful import, not request time. |
| Medium / data integrity | Importer wrote rows without validation or one transaction; parser only rejected selected ACS sentinels | Shared JSON validation, atomic database upserts, broader numeric rejection and request timeout added. |
| Medium / analytics | Local-year parsing interpreted Jan 1 UTC as previous year in Pacific time; Python/TS insight growth differed; insights ignored filters | UTC year operations, percentage income growth and filtered insight generation; omit growth ranking for one year. |
| Medium / mobile accessibility | At 390px viewport, document expanded to 585px | Grid minimum widths fixed; table scroll remains inside its panel. Controls have labels, focus outlines, disabled selection limits; chart has legend/accessibility layer and table equivalent. |
| Medium / public presentation | README, page metadata, UI and GitHub description used "internship-ready", recruiter commentary and unsupported source freshness claims | Replaced with observable features, methodology, status, exact commands and limitations. |
| Low / deployment checks | `deploy:check` labeled file existence as committed, accepted default mode as intentional and did not fail | Script now validates local configuration/dataset, exits nonzero on failures and explicitly disclaims remote validation. |

## Remaining dependency findings

`pnpm audit --json` after changes reports **0 critical, 8 high, 1 moderate** advisories (counts are advisory records, not independently exploitable application flaws). Compatible overrides update PostCSS, nanoid 3, source-map-js and brace-expansion 1. No advisories were suppressed.

| Dependency | Remaining advisory / required change | Current disposition |
| --- | --- | --- |
| sharp | [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj), [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c); patched in 0.35.4+ | Next.js transitive image tooling; app has no user uploads or `next/image` UI. Upgrade requires compatibility verification; not overridden across a minor API boundary. |
| brace-expansion 4 | Multiple high advisories and [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr); patched in 5.0.12+ | Lint dependency chain; a major replacement was not forced. |
| deepmerge-ts | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx); patched in 8+ | Prisma tooling dependency; upgrading Prisma across major versions requires a separate migration review. |
| braces | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm); audit lists no patched release | Dependency chain requires upstream replacement/fix or an explicit, documented exposure assessment. |

The CI security job intentionally fails on high findings. Runtime reachability was not exhaustively assessed. Recharts 2 and ESLint 9 also emit support/deprecation warnings; plan measured upgrades rather than assuming that upgrading major versions is harmless.

## Verification evidence

Before: `next lint`, `tsc --noEmit`, `next build` passed. Homepage was static and first-load JavaScript was approximately 209 kB. No automated tests existed.

After: standalone ESLint, typecheck, 6 Node regression tests, 3 Python tests, production build, and isolated PostgreSQL migrations/repeated imports passed. An independent copy without `.env.local` or preexisting dependencies passed frozen installation, generate, lint, typecheck, tests and build. The local installed pnpm 11 wrapper required network permission to verify/switch to pinned pnpm 10; registry checks were not bypassed. Dependency install warned about ignored lifecycle scripts; explicit Prisma generation succeeded.

Commands used: `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `python -m unittest discover -s tests -p 'test_*.py' -v`, `node tests/database.integration.mjs`, `pnpm build`, `pnpm start`, `pnpm audit --json`, `node scripts/scan_secrets.mjs --build`, `git diff --check`.

Production HTTP checks: file `/api/health` and `/api/dashboard` returned 200 with 4 metros/16 observations, `Cache-Control: no-store` and security headers. Strict database mode with an empty connection returned 503 for both endpoints and no raw exception. The build lists `/` as dynamic; first-load JavaScript is approximately 211 kB. The change prioritizes correct data loading, not a bundle-size improvement.

Browser checks: metro/metric/year changes, replacing one compared metro, selected latest table values, aligned filtered insights, desktop appearance, and 390px mobile layout. Mobile document width is within the viewport and the wide table scrolls locally. Chart values are also exposed in an HTML table. A full automated accessibility audit, load test and cross-browser matrix were not performed. `docs/images/dashboard.png` is a real local production screenshot, not a fabricated demo.

The heuristic secret scanner checked current tracked/new files, all reachable local history blobs and textual build output with no findings. It matches common token/private-key patterns and the locally configured Census key without printing it. It is not a complete credential detector. Historical commits contain a machine-specific Python command and generic local database example; published history was not rewritten. No actual tracked credential was identified by these checks. Local env files are ignored; no public API key is required for file mode.

## GitHub presentation and handoff

Repository: [YangOwen007/metro-housing-affordability-dashboard](https://github.com/YangOwen007/metro-housing-affordability-dashboard). Name retained because it accurately describes the app. GitHub description now says: "Compare annual Census ACS housing and income estimates across four U.S. metros, with a Python data pipeline and optional PostgreSQL storage." Topics reflect the actual stack and data source. No homepage, release, usage badge or testimonials were invented. No license was added without the owner's licensing decision.

The README explains data definitions, architecture, commands, optional services, security and known limits. See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel configuration and self-hosting requirements. No cloud deployment was performed. Required external steps: hosting account/GitHub import and actual preview verification; optional Census refresh secret; optional hosted PostgreSQL, pooling, migrations, data import, backups and restore test.

## Next steps

1. Resolve or explicitly assess the remaining dependency advisories before public deployment; keep the security gate visible.
2. Run CI on GitHub and verify the manual refresh with the repository secret. Confirm the host redeploys after bot-authored data changes.
3. Create a Vercel preview in file mode and check health, charts, keyboard navigation and mobile layout on the provider URL.
4. Decide licensing terms; only then add a license. Add a verified demo URL after deployment.
5. Expand statistical rigor with margins of error, inflation adjustment and deliberate annual-vintage updates before adding forecasting.

## File summary

Updated runtime/data loading, APIs, UI labels/filters/layout, config, package manifest/lockfile, env handling, setup/deploy checks, ingestion/import/bootstrap scripts and refresh workflow. Added standalone lint config, pnpm overrides, error/loading UI, shared validation, offline tests, isolated database test, initial migration, CI, Dependabot, deployment/review docs and a real screenshot. Raw data and existing processed observations, local secrets, existing application database tables, repository name and published commit history were preserved. The optional initial migration is applied only to new databases or explicitly baselined existing schemas.
