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
- The current pipeline targets the latest ACS 1-year annual snapshots available as of July 16, 2026: `2021`, `2022`, `2023`, and `2024`

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
- metro and metric filters
- comparison table across selected metros
- insight callouts generated from the normalized dataset
- Python ingestion pipeline that writes both raw and processed artifacts
- PostgreSQL-ready Prisma schema and DB import script
- API route that can read from PostgreSQL when available and falls back to the processed file otherwise

### Next likely upgrades

- connect a live PostgreSQL instance and run the Prisma import path
- add FRED mortgage-rate overlays
- scheduled refresh with GitHub Actions
- CSV export of filtered slices
- side-by-side metro comparison mode

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
scripts/              Data ingestion and database import scripts
types/                Shared TypeScript types
```

## Getting started

1. Install dependencies with `pnpm install`
2. Copy `.env.example` to `.env.local`
3. Add a valid `CENSUS_API_KEY` to `.env.local`
4. Refresh the processed dataset with `pnpm data:refresh`
4. Start the app with `pnpm dev`

## Database flow

1. Set `DATABASE_URL` in `.env.local`
2. Run `pnpm db:generate`
3. Run `pnpm db:push`
4. Run `pnpm db:import`

After those steps, the page and `/api/dashboard` route will read from PostgreSQL automatically.

## What you’ll learn by reading this repo

- how to model analytics-friendly time-series data
- how to shape raw API responses into UI-ready records
- how frontend filters map onto a normalized dataset
- how to separate ingestion, storage, and presentation concerns
