import { getChartData } from "@/lib/actions";
import { DashboardGrid } from "./dashboard-grid";

// Server component that fetches the full chart dataset once and hands it to
// the client-side grid. Wrapped in a single Suspense boundary by the caller.
export async function DashboardGridSection() {
  const initialData = await getChartData("all");
  return <DashboardGrid initialData={initialData} />;
}
