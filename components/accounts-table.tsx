"use client";

import { useState } from "react";
import {
  type Account,
  type MonthlyEntry,
  type ValueTimePeriod,
  valueTimePeriods,
} from "@/lib/types";
import { AccountRow } from "./accounts/account-row";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { TimePeriodSelector } from "./accounts/TimePeriodSelector";

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
    Record<string, Record<string, any>>
  >({});
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<ValueTimePeriod>("3M");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

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
    <div className="space-y-4">
      <TimePeriodSelector
        selectedTimePeriod={selectedTimePeriod}
        onTimePeriodChange={setSelectedTimePeriod}
      />

      <div className="space-y-3">
        {accounts.map((account) => (
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
                  },
                },
              }));
            }}
            onAddMonth={onAddNewMonth}
            onEditAccount={setEditingAccount}
            onDeleteAccount={onDeleteAccount}
          />
        ))}

        {/* Header row for desktop reference */}
        <div className="hidden sm:grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
          <div>Account Name</div>
          <div>Type</div>
          <div>Current Value</div>
          <div>
            {
              valueTimePeriods.find((p) => p.value === selectedTimePeriod)
                ?.label
            }{" "}
            Change
          </div>
          <div>% Change</div>
        </div>
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
