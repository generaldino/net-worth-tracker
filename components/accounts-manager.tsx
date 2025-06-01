import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AccountsTable } from "@/components/accounts-table";
import { ChartSection } from "@/components/chart-section";
import {
  calculateNetWorth,
  getAccounts,
  getMonthlyData,
  getCurrentValue,
  getAccountHistory,
  calculateValueChange,
} from "@/lib/actions";
import { AddAccountButton } from "@/components/add-account-dialog";

export async function AccountsManager() {
  const [netWorth, accounts, monthlyData] = await Promise.all([
    calculateNetWorth(),
    getAccounts(),
    getMonthlyData(),
  ]);

  // Fetch all account data in parallel
  const accountData = await Promise.all(
    accounts.map(async (account) => {
      const [currentValue, history, valueChange] = await Promise.all([
        getCurrentValue(account.id),
        getAccountHistory(account.id),
        calculateValueChange(account.id, "3M"), // Default to 3M period
      ]);

      return {
        accountId: account.id,
        currentValue,
        history,
        valueChange,
      };
    })
  );

  // Transform the data into the format expected by AccountsTable
  const currentValues = Object.fromEntries(
    accountData.map(({ accountId, currentValue }) => [accountId, currentValue])
  );

  const accountHistories = Object.fromEntries(
    accountData.map(({ accountId, history }) => [accountId, history])
  );

  const valueChanges = Object.fromEntries(
    accountData.map(({ accountId, valueChange }) => [accountId, valueChange])
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 px-4 max-w-7xl">
        <div className="text-center mb-6 sm:mb-8">
          <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-green-600">
            £{netWorth.toLocaleString()}
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl">
                  Your Accounts
                </CardTitle>
                <AddAccountButton />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AccountsTable
                accounts={accounts}
                monthlyData={monthlyData}
                currentValues={currentValues}
                accountHistories={accountHistories}
                valueChanges={valueChanges}
                onDeleteAccount={async (accountId) => {
                  "use server";
                  const { deleteAccount } = await import("@/lib/actions");
                  await deleteAccount(accountId);
                }}
                onUpdateMonthlyEntry={async (accountId, month, entry) => {
                  "use server";
                  const { updateMonthlyEntry } = await import("@/lib/actions");
                  if (!entry.endingBalance || !entry.cashIn || !entry.cashOut)
                    return;
                  await updateMonthlyEntry(accountId, month, {
                    endingBalance: entry.endingBalance,
                    cashIn: entry.cashIn,
                    cashOut: entry.cashOut,
                  });
                }}
                onAddNewMonth={async (accountId, month, entry) => {
                  "use server";
                  const { addMonthlyEntry } = await import("@/lib/actions");
                  await addMonthlyEntry(accountId, month, {
                    endingBalance: entry.endingBalance,
                    cashIn: entry.cashIn,
                    cashOut: entry.cashOut,
                  });
                }}
              />
            </CardContent>
          </Card>

          <ChartSection />
        </div>
      </div>
    </div>
  );
}
