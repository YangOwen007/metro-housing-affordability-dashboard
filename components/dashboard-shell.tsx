"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { getMetricChange, getObservationsForRegion, metricConfig } from "@/lib/dashboard-data";
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
  const [selectedRegionId, setSelectedRegionId] = useState(dataset.regions[0]?.id ?? "");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("medianRent");

  const activeRegion = dataset.regions.find((region) => region.id === selectedRegionId) ?? dataset.regions[0];
  const activeSeries = activeRegion ? getObservationsForRegion(dataset, activeRegion.id) : [];
  const summaryCards = metricOptions
    .map((metric) => {
      if (!activeRegion) {
        return null;
      }

      const change = getMetricChange(dataset, activeRegion.id, metric);

      if (!change) {
        return null;
      }

      return {
        metric,
        ...change
      };
    })
    .filter(Boolean);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Summer 2026 portfolio build</p>
          <h1>Metro housing affordability dashboard</h1>
          <p className="hero-copy">
            Explore how median rent, home values, income, vacancy rate, and rent burden change across
            major U.S. metros using normalized Census ACS data.
          </p>
        </div>
        <div className="hero-meta">
          <div>
            <span>Dataset updated</span>
            <strong>{new Date(dataset.updatedAt).toLocaleDateString()}</strong>
          </div>
          <div>
            <span>Regions in MVP</span>
            <strong>{dataset.regions.length}</strong>
          </div>
          <div>
            <span>Live source</span>
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

        <div className="selection-context">
          <span>Selected market</span>
          <strong>
            {activeRegion?.name}, {activeRegion?.state}
          </strong>
          <small>{activeRegion?.populationLabel}</small>
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
              The chart is built from normalized yearly records, so swapping from the file artifact to
              PostgreSQL does not change the UI contract.
            </p>
          </div>

          <div className="chart-frame">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeSeries}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString(undefined, {
                      year: "numeric"
                    })
                  }
                  stroke="#5f6b85"
                />
                <YAxis stroke="#5f6b85" />
                <Tooltip
                  formatter={(value: number) => metricConfig[selectedMetric].formatter(value)}
                  labelFormatter={(value) => new Date(value).getFullYear().toString()}
                />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={metricConfig[selectedMetric].color}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
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
            {dataset.insights.map((insight) => (
              <div key={insight.id} className="insight-card">
                <strong>{insight.title}</strong>
                <p>{insight.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Comparison table</p>
            <h2>Latest metro snapshot</h2>
          </div>
          <p className="panel-copy">
            Exact values matter in real analytics products, so this table complements the trend chart with
            recruiter-friendly scanability.
          </p>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Metro</th>
                <th>Median rent</th>
                <th>Home value</th>
                <th>Median income</th>
                <th>Vacancy rate</th>
                <th>Rent burden</th>
              </tr>
            </thead>
            <tbody>
              {dataset.regions.map((region) => {
                const latest = getObservationsForRegion(dataset, region.id).at(-1);

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
            <p className="eyebrow">Learning angle</p>
            <h2>What this version now demonstrates</h2>
          </div>
        </div>

        <div className="learning-grid">
          <div>
            <strong>Real ingestion</strong>
            <p>Fetch official ACS metro data, clean the response shape, and publish a normalized artifact the app can read.</p>
          </div>
          <div>
            <strong>Storage design</strong>
            <p>Use one region table plus one time-series observation table so the API can evolve from file-backed to DB-backed reads cleanly.</p>
          </div>
          <div>
            <strong>Analytics thinking</strong>
            <p>Convert raw rent and income values into a rent-burden metric that tells a more useful story than the source fields alone.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
