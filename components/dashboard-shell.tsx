"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  buildComparisonSeries,
  buildInsights,
  filterObservationsByYearRange,
  comparisonPalette,
  getAvailableYears,
  getLatestObservationInRange,
  getMetricChange,
  metricConfig
} from "@/lib/dashboard-data";
import type { DashboardDataset, MetricKey } from "@/types/dashboard";

type DashboardShellProps = {
  dataset: DashboardDataset;
};

const metricOptions: MetricKey[] = [
  "medianRent",
  "medianHomeValue",
  "medianIncome",
  "vacancyRate",
  "affordabilityPressure"
];

// This component owns the interactive state so the server-rendered page can stay simple.
export function DashboardShell({ dataset }: DashboardShellProps) {
  const availableYears = getAvailableYears(dataset);
  const defaultRegionIds = dataset.regions.slice(0, 2).map((region) => region.id);
  const [selectedRegionId, setSelectedRegionId] = useState(dataset.regions[0]?.id ?? "");
  const [comparisonRegionIds, setComparisonRegionIds] = useState<string[]>(defaultRegionIds);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("medianRent");
  const [startYear, setStartYear] = useState<number>(availableYears[0] ?? 2021);
  const [endYear, setEndYear] = useState<number>(availableYears.at(-1) ?? 2024);

  const activeRegion = dataset.regions.find((region) => region.id === selectedRegionId) ?? dataset.regions[0];
  const activeSeries = buildComparisonSeries(
    dataset,
    comparisonRegionIds,
    startYear,
    endYear,
    selectedMetric
  );
  const summaryCards = metricOptions
    .map((metric) => {
      if (!activeRegion) {
        return null;
      }

      const change = getMetricChange(dataset, activeRegion.id, metric, startYear, endYear);

      if (!change) {
        return null;
      }

      return {
        metric,
        ...change
      };
    })
    .filter(Boolean);
  const comparisonRegions = comparisonRegionIds
    .map((regionId) => dataset.regions.find((region) => region.id === regionId))
    .filter(Boolean);
  // Insights follow the same metro/year selection as the comparison chart.
  const insights = buildInsights(
    dataset.regions.filter((region) => comparisonRegionIds.includes(region.id)),
    filterObservationsByYearRange(dataset.observations, startYear, endYear)
  );
  const regionColor = (id: string) => comparisonPalette[
    dataset.regions.findIndex((region) => region.id === id) % comparisonPalette.length
  ];

  if (!dataset.regions.length || !availableYears.length) {
    return <main className="page-shell"><section className="panel-card" role="status">
      <h1>No housing data available</h1><p>The dataset has no observations to display.</p>
    </section></main>;
  }

  function handleComparisonSelection(regionId: string, checked: boolean) {
    setComparisonRegionIds((currentRegionIds) => {
      if (checked) {
        return currentRegionIds.includes(regionId)
          ? currentRegionIds
          : [...currentRegionIds, regionId].slice(0, 2);
      }

      if (currentRegionIds.length === 1) {
        return currentRegionIds;
      }

      return currentRegionIds.filter((currentRegionId) => currentRegionId !== regionId);
    });
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Annual Census ACS estimates</p>
          <h1>Metro housing affordability dashboard</h1>
          <p className="hero-copy">
            Explore how median rent, home values, income, vacancy rate, and rent / income ratios change across
            major U.S. metros using normalized Census ACS data.
          </p>
        </div>
        <div className="hero-meta">
          <div>
            <span>Dataset loaded</span>
            <strong>{new Date(dataset.updatedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}</strong>
          </div>
          <div>
            <span>Metro areas</span>
            <strong>{dataset.regions.length}</strong>
          </div>
          <div>
            <span>Data source</span>
            <strong>{dataset.source}</strong>
          </div>
        </div>
      </section>

      <section className="toolbar-card">
        <div className="field-group">
          <label htmlFor="region">Metro</label>
          <select
            id="region"
            value={selectedRegionId}
            onChange={(event) => setSelectedRegionId(event.target.value)}
          >
            {dataset.regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}, {region.state}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="metric">Primary chart metric</label>
          <select
            id="metric"
            value={selectedMetric}
            onChange={(event) => setSelectedMetric(event.target.value as MetricKey)}
          >
            {metricOptions.map((metric) => (
              <option key={metric} value={metric}>
                {metricConfig[metric].label}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="start-year">Year window</label>
          <div className="inline-selects">
            <select
              id="start-year"
              value={startYear}
              onChange={(event) => {
                const nextStartYear = Number(event.target.value);
                setStartYear(nextStartYear);
                if (nextStartYear > endYear) {
                  setEndYear(nextStartYear);
                }
              }}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              aria-label="End year"
              value={endYear}
              onChange={(event) => {
                const nextEndYear = Number(event.target.value);
                setEndYear(nextEndYear);
                if (nextEndYear < startYear) {
                  setStartYear(nextEndYear);
                }
              }}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="selection-context toolbar-context">
          <span>Selected market</span>
          <strong>
            {activeRegion?.name}, {activeRegion?.state}
          </strong>
          <small>{activeRegion?.populationLabel}</small>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Comparison mode</p>
            <h2>Compare up to two metros side by side</h2>
          </div>
          <p className="panel-copy">
            Select one or two metro areas. The selected market above controls the KPI cards;
            the comparison selection controls the chart, insights, and table.
          </p>
        </div>

        <div className="comparison-selector-grid">
          {dataset.regions.map((region, index) => {
            const isSelected = comparisonRegionIds.includes(region.id);

            return (
              <label
                key={region.id}
                className={`comparison-chip ${isSelected ? "selected" : ""}`}
                style={{
                  borderColor: isSelected ? comparisonPalette[index % comparisonPalette.length] : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={(!isSelected && comparisonRegionIds.length >= 2) || (isSelected && comparisonRegionIds.length === 1)}
                  onChange={(event) => handleComparisonSelection(region.id, event.target.checked)}
                />
                <span>
                  {region.name}, {region.state}
                </span>
                <small>{region.populationLabel}</small>
              </label>
            );
          })}
        </div>
      </section>

      <section className="kpi-grid">
        {summaryCards.map((card) => {
          if (!card) {
            return null;
          }

          const config = metricConfig[card.metric];
          const direction = card.absoluteChange >= 0 ? "up" : "down";

          return (
            <article key={card.metric} className="kpi-card">
              <div className="kpi-label-row">
                <span>{config.label}</span>
                <span className={`delta-pill ${direction}`}>
                  {card.percentChange >= 0 ? "+" : ""}
                  {card.percentChange.toFixed(1)}%
                </span>
              </div>
              <strong>{config.formatter(card.end)}</strong>
              <p>Changed from {config.formatter(card.start)} across the current ACS time window.</p>
            </article>
          );
        })}
      </section>

      <section className="chart-grid">
        <article className="panel-card panel-large">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trend view</p>
              <h2>{metricConfig[selectedMetric].label} over time</h2>
            </div>
            <p className="panel-copy">
              The chart compares the selected metros across the chosen year window, while still relying on
              the same normalized yearly records that drive the rest of the dashboard.
            </p>
          </div>

          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSeries} accessibilityLayer>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#5f6b85"
                />
                <YAxis stroke="#5f6b85" />
                <Tooltip
                  formatter={(value: number) => metricConfig[selectedMetric].formatter(value)}
                  labelFormatter={(value) => value.toString()}
                />
                <Legend />
                {comparisonRegions.map((region) => (
                  <Line
                    key={region!.id}
                    type="monotone"
                    dataKey={region!.id}
                    name={region!.name}
                    stroke={regionColor(region!.id)}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Insight callouts</p>
              <h2>What the current data suggests</h2>
            </div>
          </div>

          <div className="insight-list">
            {insights.map((insight) => (
              <div key={insight.id} className="insight-card">
                <strong>{insight.title}</strong>
                <p>{insight.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="comparison-card-grid">
        {comparisonRegions.map((region) => {
          if (!region) {
            return null;
          }

          const latestObservation = getLatestObservationInRange(dataset, region.id, startYear, endYear);
          const metricChange = getMetricChange(dataset, region.id, selectedMetric, startYear, endYear);

          if (!latestObservation || !metricChange) {
            return null;
          }

          return (
            <article
              key={region.id}
              className="panel-card comparison-summary-card"
              style={{ borderTop: `4px solid ${regionColor(region.id)}` }}
            >
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Selected comparison</p>
                  <h2>
                    {region.name}, {region.state}
                  </h2>
                </div>
                <span className={`delta-pill ${metricChange.absoluteChange >= 0 ? "up" : "down"}`}>
                  {metricChange.percentChange >= 0 ? "+" : ""}
                  {metricChange.percentChange.toFixed(1)}%
                </span>
              </div>
              <div className="comparison-metric-grid">
                <div>
                  <span>Latest {metricConfig[selectedMetric].label}</span>
                  <strong>{metricConfig[selectedMetric].formatter(latestObservation[selectedMetric])}</strong>
                </div>
                <div>
                  <span>Median income</span>
                  <strong>{metricConfig.medianIncome.formatter(latestObservation.medianIncome)}</strong>
                </div>
                <div>
                  <span>Vacancy rate</span>
                  <strong>{metricConfig.vacancyRate.formatter(latestObservation.vacancyRate)}</strong>
                </div>
                <div>
                  <span>Rent / income ratio</span>
                  <strong>{metricConfig.affordabilityPressure.formatter(latestObservation.affordabilityPressure)}</strong>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Comparison table</p>
            <h2>Latest metro snapshot</h2>
          </div>
          <p className="panel-copy">
            Values are for the latest available observation in the selected year window.
          </p>
        </div>

        <div className="table-scroll">
          <table>
            <caption>Selected metro estimates, {startYear}-{endYear}. Dollar amounts are nominal.</caption>
            <thead>
              <tr>
                <th>Metro</th>
                <th>Year</th>
                <th>Median rent</th>
                <th>Home value</th>
                <th>Median income</th>
                <th>Vacancy rate</th>
                <th>Rent / income ratio</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRegions.map((region) => {
                if (!region) {
                  return null;
                }

                const latest = getLatestObservationInRange(dataset, region.id, startYear, endYear);

                if (!latest) {
                  return null;
                }

                return (
                  <tr key={region.id}>
                    <td>
                      <strong>{region.name}</strong>
                      <span>
                        {region.state} - {region.populationLabel}
                      </span>
                    </td>
                    <td>{new Date(latest.date).getUTCFullYear()}</td>
                    <td>{metricConfig.medianRent.formatter(latest.medianRent)}</td>
                    <td>{metricConfig.medianHomeValue.formatter(latest.medianHomeValue)}</td>
                    <td>{metricConfig.medianIncome.formatter(latest.medianIncome)}</td>
                    <td>{metricConfig.vacancyRate.formatter(latest.vacancyRate)}</td>
                    <td>{metricConfig.affordabilityPressure.formatter(latest.affordabilityPressure)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Methodology</p>
            <h2>How to interpret these estimates</h2>
          </div>
        </div>

        <div className="learning-grid">
          <div>
            <strong>Annual estimates</strong>
            <p>ACS 1-year estimates cover metro areas, not just city boundaries. The fixed dataset covers 2021-2024 and does not include margins of error.</p>
          </div>
          <div>
            <strong>Total housing vacancy</strong>
            <p>Vacant housing units divided by all housing units includes seasonal and other vacancies. It is not a count of available rentals.</p>
          </div>
          <div>
            <strong>Ratio of medians</strong>
            <p>Median monthly gross rent times 12 divided by median income for all households is a comparison proxy. It does not measure renter cost burden. Dollars are not inflation adjusted.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
