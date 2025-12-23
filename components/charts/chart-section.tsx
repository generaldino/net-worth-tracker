import { ChartControls } from "@/components/charts/chart-controls";
import { getChartData, getAccounts, getProjectionScenarios } from "@/lib/actions";

export async function ChartSection() {
  const [initialData, accounts, scenarios] = await Promise.all([
    getChartData("all"), // No currency conversion - done client-side
    getAccounts(),
    getProjectionScenarios(),
  ]);

  // Get unique owners from accounts
  const owners = Array.from(new Set(accounts.map((account) => account.owner)));

  return (
    <div className="space-y-4">
      <ChartControls initialData={initialData} owners={owners} scenarios={scenarios} />
    </div>
  );
}
