import { ChartControls } from "@/components/charts/chart-controls";
import { getChartData } from "@/lib/actions";
import { getAccounts } from "@/lib/actions";

export async function ChartSection() {
  const [initialData, accounts] = await Promise.all([
    getChartData("all"),
    getAccounts(),
  ]);

  console.log("initialData", initialData);

  // Get unique owners from accounts
  const owners = Array.from(new Set(accounts.map((account) => account.owner)));

  return (
    <div className="space-y-4">
      <ChartControls initialData={initialData} owners={owners} />
    </div>
  );
}
