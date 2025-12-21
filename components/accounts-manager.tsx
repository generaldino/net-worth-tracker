import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AccountsTable } from "@/components/accounts-table";
import { ChartSection } from "@/components/charts/chart-section";
import {
  calculateNetWorth,
  getAccounts,
  getMonthlyData,
  getCurrentValue,
  getAccountHistory,
} from "@/lib/actions";
import { AddAccountButton } from "@/components/add-account-dialog";
import { ExportCSVButton } from "@/components/export-csv-button";
import { MaskToggleButton } from "@/components/mask-toggle-button";
import { NetWorthDisplay } from "@/components/net-worth-display";

export async function AccountsManager() {
  const [netWorth, accounts, monthlyData] = await Promise.all([
    calculateNetWorth(),
    getAccounts(true), // Always fetch all accounts, including closed ones
    getMonthlyData(),
  ]);

  // Fetch all account data in parallel
  const accountData = await Promise.all(
    accounts.map(async (account) => {
      const [currentValue, history] = await Promise.all([
        getCurrentValue(account.id),
        getAccountHistory(account.id),
      ]);

      return {
        accountId: account.id,
        currentValue,
        history,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 px-4 max-w-7xl">
        <div className="text-center mb-6 sm:mb-8">
          <NetWorthDisplay netWorth={netWorth} />
        </div>

        <div className="space-y-4 sm:space-y-6">
          <ChartSection />

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl">
                  Your Accounts
                </CardTitle>
                <div className="flex items-center gap-2">
                  <MaskToggleButton />
                  <ExportCSVButton />
                  <AddAccountButton />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AccountsTable
                accounts={accounts}
                monthlyData={monthlyData}
                currentValues={currentValues}
                accountHistories={accountHistories}
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
                    workIncome: entry.workIncome || 0,
                  });
                }}
                onAddNewMonth={async (accountId, month, entry) => {
                  "use server";
                  const { addMonthlyEntry } = await import("@/lib/actions");
                  await addMonthlyEntry(accountId, month, {
                    endingBalance: entry.endingBalance,
                    cashIn: entry.cashIn,
                    cashOut: entry.cashOut,
                    workIncome: entry.workIncome || 0,
                  });
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
