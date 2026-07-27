# Metro Housing Affordability Dashboard

A polished portfolio project that shows the full data lifecycle: fetching public metro housing data, cleaning and normalizing it, storing it in a relational model, and presenting it through an internship-ready dashboard UI.

## Why this project

This is a strong internship portfolio piece because it demonstrates:

- data ingestion from real public sources
- transformation and normalization work
- storage design for time-series analytics
- a modern TypeScript product surface
- product thinking around filters, KPIs, drill-downs, and insight callouts

## Current data sources

- U.S. Census ACS 1-year estimates for metro-level median rent, median home value, median household income, and vacancy counts: [ACS API](https://www.census.gov/programs-surveys/acs/data/data-via-api.html)
- The current pipeline targets the latest ACS 1-year annual snapshots available as of July 27, 2026: `2021`, `2022`, `2023`, and `2024`

## Why ACS first

ACS is the strongest first live source for this dashboard because it is:

- official and stable
- available by metro area
- rich enough to support both raw metrics and derived analytics
- realistic for an internship-scale MVP

The original scaffold used a placeholder "inventory" metric, but the live pipeline now uses `vacancyRate` instead because that is directly supported by ACS and is a more honest source-aligned metric.

## MVP scope

Build one dashboard focused on U.S. metro housing affordability trends.

### Current MVP features

- KPI cards for median rent, median home value, median income, vacancy rate, and rent burden
- line chart for a selected metric over time
- two-metro comparison mode with a selectable year window
- metro and metric filters
- comparison table across selected metros
- insight callouts generated from the normalized dataset
- Python ingestion pipeline that writes both raw and processed artifacts
- PostgreSQL-ready Prisma schema and DB import script
- API route that can read from PostgreSQL when available and falls back to the processed file otherwise
- GitHub Actions workflow that refreshes the tracked dataset on a schedule
- deployment health route at `/api/health`
- explicit production data-source control through `DATA_SOURCE_MODE`

### Next likely upgrades

- add FRED mortgage-rate overlays
- CSV export of filtered slices
- deployment with a hosted PostgreSQL database

## Tech stack

- Frontend: Next.js App Router + TypeScript
- Styling: custom CSS with a dashboard-oriented design system
- Charts: Recharts
- Data pipeline: Python
- Data model: PostgreSQL + Prisma

## Project structure

```text
app/                  Next.js pages and API routes
components/           Dashboard UI components
data/raw/             Saved source snapshots for debugging and learning
data/processed/       Normalized dataset consumed by the app
lib/                  Shared data loading and transformation helpers
prisma/               Database schema
scripts/              Data ingestion, database bootstrap, and deployment checks
types/                Shared TypeScript types
```

## Getting started

1. Install dependencies with `pnpm install`
2. Copy `.env.example` to `.env.local`
3. Run `pnpm setup:check` to see what is still missing
4. Add a valid `CENSUS_API_KEY` to `.env.local`
5. Refresh the processed dataset with `pnpm data:refresh`
6. Start the app with `pnpm dev`

## Database flow

1. Set `DATABASE_URL` in `.env.local`
2. Run `pnpm db:generate`
3. Run `pnpm db:push`
4. Run `pnpm db:import`

After those steps, the page and `/api/dashboard` route will read from PostgreSQL automatically.

## Setup notes

- The Python pipeline, Prisma commands, and database import script all read from `.env.local`, so you only need one local env file.
- If something is missing, `pnpm setup:check` gives a quick status report before you run the heavier commands.
- The scheduled GitHub Actions refresh expects a repository secret named `CENSUS_API_KEY`.

## Deployment readiness

Use `pnpm deploy:check` before hosting the app. It checks:

- whether the processed fallback dataset exists
- whether `DATA_SOURCE_MODE` is set intentionally
- whether `DATABASE_URL` is ready when database mode is required
- whether your Census key is ready for scheduled refreshes

### Data source modes

The app now supports an explicit `DATA_SOURCE_MODE` env var:

- `auto`: prefer PostgreSQL when available, otherwise fall back to the committed processed dataset
- `database`: require PostgreSQL and fail health checks if the DB is unavailable
- `file`: always serve the committed processed dataset

For first deployment, `auto` is the safest option. Once you move to a hosted PostgreSQL database and want stricter behavior, switch to `database`.

### Health checks

The route `/api/health` returns:

- whether the app is healthy
- which data source mode is configured
- whether the app resolved to `database` or `file`
- the current dataset timestamp and region count

This is useful for deployment verification and uptime checks.

## Scheduled refresh

The workflow at `.github/workflows/refresh-dashboard-data.yml` does two things:

- fetches the latest ACS snapshots on a weekly schedule or manual trigger
- commits refreshed raw and processed data files back to the repository when they change

To enable it on GitHub:

1. Open your repository settings
2. Go to `Secrets and variables -> Actions`
3. Add a repository secret named `CENSUS_API_KEY`

This workflow intentionally refreshes the tracked data artifact in GitHub rather than trying to reach your local PostgreSQL instance from GitHub Actions.

## What you’ll learn by reading this repo

- how to model analytics-friendly time-series data
- how to shape raw API responses into UI-ready records
- how frontend filters map onto a normalized dataset
- how to separate ingestion, storage, presentation, and deployment concerns
