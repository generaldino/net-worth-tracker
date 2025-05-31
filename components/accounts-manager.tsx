"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { AccountsTable } from "@/components/accounts-table";
import { ChartSection } from "@/components/chart-section";
import {
  accounts as initialAccounts,
  monthlyData as initialMonthlyData,
  calculateNetWorth,
} from "@/lib/data";
import type { Account, MonthlyData, MonthlyEntry } from "@/lib/data";

export function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [monthlyData, setMonthlyData] =
    useState<MonthlyData>(initialMonthlyData);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleAddAccount = (newAccount: Omit<Account, "id">) => {
    const account = {
      ...newAccount,
      id: Date.now(),
    };
    setAccounts([...accounts, account]);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setEditDialogOpen(true);
  };

  const handleUpdateAccount = (updatedAccount: Account) => {
    setAccounts(
      accounts.map((account) =>
        account.id === updatedAccount.id ? updatedAccount : account
      )
    );
  };

  const handleDeleteAccount = (accountId: number) => {
    if (confirm("Are you sure you want to delete this account?")) {
      setAccounts(accounts.filter((account) => account.id !== accountId));
      // Also remove from monthly data
      const updatedMonthlyData = { ...monthlyData };
      Object.keys(updatedMonthlyData).forEach((month) => {
        updatedMonthlyData[month] = updatedMonthlyData[month].filter(
          (entry) => entry.accountId !== accountId
        );
      });
      setMonthlyData(updatedMonthlyData);
    }
  };

  const handleUpdateMonthlyEntry = (
    accountId: number,
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
      // Update existing entry
      updatedMonthlyData[month][entryIndex] = {
        ...updatedMonthlyData[month][entryIndex],
        ...updatedEntry,
      };
    } else {
      // Add new entry if it doesn't exist
      const newEntry: MonthlyEntry = {
        accountId,
        endingBalance: updatedEntry.endingBalance || 0,
        cashIn: updatedEntry.cashIn || 0,
        cashOut: updatedEntry.cashOut || 0,
      };
      updatedMonthlyData[month].push(newEntry);
    }

    setMonthlyData(updatedMonthlyData);
  };

  const handleAddNewMonth = (
    accountId: number,
    month: string,
    entry: MonthlyEntry
  ) => {
    // Check if month already exists for this account
    if (monthlyData[month]?.some((e) => e.accountId === accountId)) {
      alert(
        "An entry for this month already exists. Please edit the existing entry instead."
      );
      return;
    }

    handleUpdateMonthlyEntry(accountId, month, entry);
  };

  const netWorth = calculateNetWorth();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 px-4 max-w-7xl">
        {/* Mobile-optimized header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            💰 Wealth Tracker
          </h1>
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
                <AddAccountDialog onAddAccount={handleAddAccount} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <AccountsTable
                accounts={accounts}
                monthlyData={monthlyData}
                onEditAccount={handleEditAccount}
                onDeleteAccount={handleDeleteAccount}
                onUpdateMonthlyEntry={handleUpdateMonthlyEntry}
                onAddNewMonth={handleAddNewMonth}
              />
            </CardContent>
          </Card>

          <ChartSection />
        </div>

        <EditAccountDialog
          account={editingAccount}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onUpdateAccount={handleUpdateAccount}
        />
      </div>
    </div>
  );
}
