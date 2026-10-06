// Shared runtime validation protects both the API reader and the database importer.
export function validateDataset(dataset) {
  const fail = () => { throw new Error("Invalid dashboard dataset; check schema, dates, and metric values."); };
  if (!dataset || typeof dataset !== "object" ||
      !Number.isFinite(Date.parse(dataset.updatedAt)) || typeof dataset.source !== "string" ||
      !Array.isArray(dataset.regions) || !dataset.regions.length ||
      !Array.isArray(dataset.observations) || !dataset.observations.length) fail();
  const ids = new Set();
  const codes = new Set();
  for (const region of dataset.regions) {
    if (!region || ["id", "cbsaCode", "name", "state", "populationLabel"].some(
      (field) => typeof region[field] !== "string" || !region[field].trim()
    ) || ids.has(region.id) || codes.has(region.cbsaCode)) fail();
    ids.add(region.id);
    codes.add(region.cbsaCode);
  }
  const keys = new Set();
  const observedIds = new Set();
  for (const record of dataset.observations) {
    if (!record || !ids.has(record.regionId) || typeof record.date !== "string" ||
        !/^\d{4}-01-01T00:00:00(?:\.000)?Z$/.test(record.date) ||
        !Number.isFinite(Date.parse(record.date))) fail();
    const key = `${record.regionId}:${Date.parse(record.date)}`;
    if (keys.has(key)) fail();
    keys.add(key);
    observedIds.add(record.regionId);
    if (["medianRent", "medianHomeValue", "medianIncome", "vacancyRate", "affordabilityPressure"].some(
      (field) => !Number.isFinite(record[field]) || record[field] < 0
    ) || record.medianIncome === 0 || record.vacancyRate > 100 ||
        Math.abs(record.affordabilityPressure - record.medianRent * 1200 / record.medianIncome) > 0.02) fail();
  }
  if (observedIds.size !== ids.size) fail();
}
