import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import runtime from "../.test-build/lib/runtime-config.js";
import analytics from "../.test-build/lib/dashboard-data.js";
import { validateDataset } from "../scripts/validate_dataset.mjs";
import { loadProjectEnv } from "../scripts/env-utils.mjs";

const dataset = JSON.parse(readFileSync("data/processed/housing_dashboard_sample.json", "utf8"));

// These cases protect storage policy: file mode must never touch an optional database.
test("file bypasses database; database fails closed; auto falls back", async () => {
  let calls = 0;
  const file = async () => dataset;
  const broken = async () => { calls++; throw new Error("unavailable"); };
  assert.equal((await runtime.resolveSource("file", file, broken)).resolvedSource, "file");
  assert.equal(calls, 0);
  await assert.rejects(runtime.resolveSource("database", file, broken));
  assert.equal((await runtime.resolveSource("auto", file, broken)).resolvedSource, "file");
  assert.equal((await runtime.resolveSource("database", file, file)).resolvedSource, "database");
});
test("mode typos fail and unset mode defaults to file", () => {
  assert.equal(runtime.getDataSourceMode(""), "file");
  assert.throws(() => runtime.getDataSourceMode("databsae"));
});

// Malformed data must fail before any database mutation or API serialization.
test("committed data validates; duplicates, sentinels, orphan rows and bad ratios fail", () => {
  validateDataset(dataset);
  for (const mutate of [
    (d) => d.observations.push(d.observations[0]),
    (d) => { d.observations[0].medianIncome = 0; },
    (d) => { d.observations[0].medianRent = -666666666; },
    (d) => { d.observations[0].vacancyRate = 101; },
    (d) => { d.observations[0].regionId = "unknown"; },
    (d) => { d.observations[0].affordabilityPressure = 99; },
    (d) => { d.observations = []; }
  ]) {
    const invalid = structuredClone(dataset);
    mutate(invalid);
    assert.throws(() => validateDataset(invalid));
  }
});
test("year boundaries use UTC and comparison filters do not mutate observations", () => {
  const before = structuredClone(dataset);
  assert.deepEqual(analytics.getAvailableYears(dataset), [2021, 2022, 2023, 2024]);
  const series = analytics.buildComparisonSeries(dataset, [dataset.regions[0].id], 2022, 2023, "medianRent");
  assert.deepEqual(series.map((row) => row.year), ["2022", "2023"]);
  assert.equal(analytics.getLatestObservationInRange(dataset, dataset.regions[0].id, 2021, 2021).date.slice(0, 4), "2021");
  assert.deepEqual(dataset, before);
  assert.equal(analytics.getMetricChange(dataset, "missing", "medianRent"), null);
});
test("filtered insight winner uses percentage growth rather than absolute dollars", () => {
  const regions = dataset.regions.slice(0, 2);
  const observation = dataset.observations[0];
  const records = regions.flatMap((region, index) => [
    { ...observation, regionId: region.id, date: "2021-01-01T00:00:00.000Z", medianIncome: index ? 200 : 50 },
    { ...observation, regionId: region.id, date: "2024-01-01T00:00:00.000Z", medianIncome: index ? 240 : 75 }
  ]);
  assert.match(analytics.buildInsights(regions, records)[1].title, new RegExp(regions[0].name));
  assert.deepEqual(analytics.buildInsights([], []), []);
  assert.equal(analytics.buildInsights(regions, records.filter((record) => record.date.startsWith("2024"))).length, 2);
});
test("local env overrides base env; explicit shell values including empty strings win", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "dashboard-env-"));
  const key = "DASHBOARD_TEST_SETTING";
  try {
    writeFileSync(path.join(directory, ".env"), `${key}=base`);
    writeFileSync(path.join(directory, ".env.local"), `${key}=local`);
    delete process.env[key];
    loadProjectEnv(directory);
    assert.equal(process.env[key], "local");
    process.env[key] = "";
    loadProjectEnv(directory);
    assert.equal(process.env[key], "");
  } finally {
    delete process.env[key];
    rmSync(directory, { recursive: true });
  }
});
