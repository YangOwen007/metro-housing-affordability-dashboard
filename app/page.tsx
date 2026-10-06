import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardDataset } from "@/lib/dashboard-repository";

// Read at request time so deployments do not freeze database results during build.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The page stays thin so the data contract and UI logic are easier to read separately.
export default async function HomePage() {
  const dataset = await getDashboardDataset();

  return <DashboardShell dataset={dataset} />;
}
