import { AccountsManagerClient } from "@/components/accounts-manager-client";
import { calculateNetWorth, getAccounts, getMonthlyData } from "@/lib/actions";

export async function AccountsManager() {
  const [netWorth, accounts, monthlyData] = await Promise.all([
    calculateNetWorth(),
    getAccounts(),
    getMonthlyData(),
  ]);

  console.log("Accounts:", accounts);
  console.log("Monthly Data:", monthlyData);

  return (
    <AccountsManagerClient
      initialAccounts={accounts}
      initialMonthlyData={monthlyData}
      netWorth={netWorth}
    />
  );
}
