"use client";

import { useState } from "react";
import {
  type Account,
  type MonthlyEntry,
  type ValueTimePeriod,
} from "@/lib/types";
import { AccountRow } from "./accounts/account-row";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { TimePeriodSelector } from "./accounts/TimePeriodSelector";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface AccountsTableProps {
  accounts: Account[];
  monthlyData: Record<string, MonthlyEntry[]>;
  currentValues: Record<string, number>;
  accountHistories: Record<string, MonthlyEntry[]>;
  valueChanges: Record<
    string,
    { absoluteChange: number; percentageChange: number }
  >;
  onDeleteAccount: (accountId: string) => void;
  onUpdateMonthlyEntry: (
    accountId: string,
    month: string,
    entry: Partial<MonthlyEntry>
  ) => void;
  onAddNewMonth: (
    accountId: string,
    month: string,
    entry: MonthlyEntry
  ) => void;
}

export function AccountsTable({
  accounts,
  monthlyData,
  currentValues,
  accountHistories,
  valueChanges,
  onDeleteAccount,
  onUpdateMonthlyEntry,
  onAddNewMonth,
}: AccountsTableProps) {
  const [editingValues, setEditingValues] = useState<
    Record<
      string,
      Record<
        string,
        {
          endingBalance: string;
          cashIn: string;
          cashOut: string;
          workIncome: string;
        }
      >
    >
  >({});
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<ValueTimePeriod>("3M");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showClosedAccounts, setShowClosedAccounts] = useState(false);

  const filteredAccounts = accounts.filter(
    (account) => showClosedAccounts || !account.isClosed
  );

  const handleValueChange = (
    accountId: string,
    month: string,
    field: string,
    value: string
  ) => {
    setEditingValues((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {}),
        [month]: {
          ...(prev[accountId]?.[month] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleSaveValue = async (accountId: string, month: string) => {
    const editedEntry = editingValues[accountId]?.[month];
    if (editedEntry) {
      const updatedEntry = {
        endingBalance: Number.parseFloat(editedEntry.endingBalance) || 0,
        cashIn: Number.parseFloat(editedEntry.cashIn) || 0,
        cashOut: Number.parseFloat(editedEntry.cashOut) || 0,
        workIncome: Number.parseFloat(editedEntry.workIncome) || 0,
      };

      await onUpdateMonthlyEntry(accountId, month, updatedEntry);

      // Clear the editing state
      setEditingValues((prev) => {
        const newState = { ...prev };
        if (newState[accountId]) {
          delete newState[accountId][month];
        }
        return newState;
      });
    }
  };

  return (
    <div className="space-y-4 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TimePeriodSelector
            selectedTimePeriod={selectedTimePeriod}
            onTimePeriodChange={setSelectedTimePeriod}
          />
          <div className="flex items-center space-x-2">
            <Switch
              id="show-closed"
              checked={showClosedAccounts}
              onCheckedChange={setShowClosedAccounts}
            />
            <Label htmlFor="show-closed">Show closed accounts</Label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredAccounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            currentValue={currentValues[account.id] || 0}
            valueChange={
              valueChanges[account.id] || {
                absoluteChange: 0,
                percentageChange: 0,
              }
            }
            history={accountHistories[account.id] || []}
            editingValues={editingValues}
            monthlyData={monthlyData}
            selectedTimePeriod={selectedTimePeriod}
            onValueChange={handleValueChange}
            onSave={handleSaveValue}
            onEdit={(accountId, month, entry) => {
              setEditingValues((prev) => ({
                ...prev,
                [accountId]: {
                  ...(prev[accountId] || {}),
                  [month]: {
                    endingBalance: entry.endingBalance.toString(),
                    cashIn: entry.cashIn.toString(),
                    cashOut: entry.cashOut.toString(),
                    workIncome: (entry.workIncome || 0).toString(),
                  },
                },
              }));
            }}
            onAddMonth={onAddNewMonth}
            onEditAccount={setEditingAccount}
            onDeleteAccount={onDeleteAccount}
          />
        ))}
      </div>

      <EditAccountDialog
        account={editingAccount}
        open={editingAccount !== null}
        onOpenChange={(open) => {
          if (!open) setEditingAccount(null);
        }}
      />
    </div>
  );
}
