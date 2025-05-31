import { AccountsManagerClient } from "@/components/accounts-manager-client";
import {
  accounts as initialAccounts,
  monthlyData as initialMonthlyData,
} from "@/lib/data";
import { calculateNetWorth } from "@/lib/actions";

export async function AccountsManager() {
  const netWorth = await calculateNetWorth();

  return (
    <AccountsManagerClient
      initialAccounts={initialAccounts}
      initialMonthlyData={initialMonthlyData}
      netWorth={netWorth}
    />
  );
}
