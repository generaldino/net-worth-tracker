"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { AccountsTable } from "@/components/accounts-table";
import { ChartSection } from "@/components/chart-section";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Account, MonthlyData, MonthlyEntry } from "@/lib/types";

interface AccountsManagerClientProps {
  initialAccounts: Account[];
  initialMonthlyData: MonthlyData;
  netWorth: number;
}

export function AccountsManagerClient({
  initialAccounts,
  initialMonthlyData,
  netWorth,
}: AccountsManagerClientProps) {
  const [monthlyData, setMonthlyData] =
    useState<MonthlyData>(initialMonthlyData);
  const [editDialogState, setEditDialogState] = useState<{
    account: Account | null;
    isOpen: boolean;
  }>({ account: null, isOpen: false });
  const router = useRouter();

  const handleUpdateMonthlyEntry = (
    accountId: string,
    month: string,
    updatedEntry: Partial<MonthlyEntry>
  ) => {
    const updatedMonthlyData = { ...monthlyData };

    if (!updatedMonthlyData[month]) {
      updatedMonthlyData[month] = [];
    }

    const entryIndex = updatedMonthlyData[month].findIndex(
      (entry) => entry.accountId === accountId
    );

    if (entryIndex >= 0) {
      const entry = updatedMonthlyData[month][entryIndex];
      const updatedEntryWithCalculations = {
        ...entry,
        ...updatedEntry,
        cashFlow:
          (updatedEntry.cashIn || entry.cashIn) -
          (updatedEntry.cashOut || entry.cashOut),
      };

      const months = Object.keys(updatedMonthlyData).sort();
      const currentMonthIndex = months.indexOf(month);
      if (currentMonthIndex > 0) {
        const previousMonth = months[currentMonthIndex - 1];
        const previousEntry = updatedMonthlyData[previousMonth].find(
          (e) => e.accountId === accountId
        );

        if (previousEntry) {
          updatedEntryWithCalculations.accountGrowth =
            updatedEntryWithCalculations.endingBalance -
            previousEntry.endingBalance -
            updatedEntryWithCalculations.cashFlow;
        }
      }

      updatedMonthlyData[month][entryIndex] = updatedEntryWithCalculations;
    } else {
      const cashFlow = (updatedEntry.cashIn || 0) - (updatedEntry.cashOut || 0);
      const newEntry: MonthlyEntry = {
        accountId,
        monthKey: month,
        month,
        endingBalance: updatedEntry.endingBalance || 0,
        cashIn: updatedEntry.cashIn || 0,
        cashOut: updatedEntry.cashOut || 0,
        cashFlow,
        accountGrowth: 0,
      };
      updatedMonthlyData[month].push(newEntry);
    }

    setMonthlyData(updatedMonthlyData);
  };

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
                <AddAccountDialog onAddAccount={() => router.refresh()} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AccountsTable
                accounts={initialAccounts}
                monthlyData={monthlyData}
                onDeleteAccount={() => router.refresh()}
                onUpdateMonthlyEntry={handleUpdateMonthlyEntry}
                onAddNewMonth={(accountId, month, entry) => {
                  if (
                    monthlyData[month]?.some((e) => e.accountId === accountId)
                  ) {
                    alert(
                      "An entry for this month already exists. Please edit the existing entry instead."
                    );
                    return;
                  }
                  handleUpdateMonthlyEntry(accountId, month, entry);
                }}
              />
            </CardContent>
          </Card>

          <ChartSection />
        </div>

        <EditAccountDialog
          account={editDialogState.account}
          open={editDialogState.isOpen}
          onOpenChange={(isOpen) =>
            setEditDialogState((prev) => ({ ...prev, isOpen }))
          }
        />
      </div>
    </div>
  );
}
