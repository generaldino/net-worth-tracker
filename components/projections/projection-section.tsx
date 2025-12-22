import { ProjectionCalculator } from "./projection-calculator";
import { getProjectionScenarios, getAccounts } from "@/lib/actions";

export async function ProjectionSection() {
  const [scenarios, accounts] = await Promise.all([
    getProjectionScenarios(),
    getAccounts(),
  ]);

  // Get unique account types from active accounts (excluding liabilities)
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
      <ProjectionCalculator
        initialScenarios={scenarios}
        accountTypes={accountTypes}
      />
    </div>
  );
}

