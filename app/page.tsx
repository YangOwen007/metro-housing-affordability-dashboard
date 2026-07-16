import { DashboardShell } from "@/components/dashboard-shell";
import { getDashboardDataset } from "@/lib/dashboard-repository";

// The page stays thin so the data contract and UI logic are easier to read separately.
export default async function HomePage() {
  const dataset = await getDashboardDataset();

  return <DashboardShell dataset={dataset} />;
}
