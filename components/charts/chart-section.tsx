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

  // Get account types for projection form
  const accountTypes = Array.from(
    new Set(
      accounts
        .filter(
          (account) =>
            !account.isClosed &&
            account.type !== "Credit_Card" &&
            account.type !== "Loan"
        )
        .map((account) => account.type)
    )
  );

  return (
    <div className="space-y-4">
      <ChartControls 
        initialData={initialData} 
        owners={owners} 
        scenarios={scenarios}
        accountTypes={accountTypes}
      />
    </div>
  );
}
