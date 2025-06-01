"use client";

import { useState, useEffect } from "react";
import {
  type Account,
  type MonthlyEntry,
  type ValueTimePeriod,
  valueTimePeriods,
} from "@/lib/types";
import { AccountRow } from "./accounts/account-row";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { TimePeriodSelector } from "./accounts/TimePeriodSelector";
import {
  getCurrentValue,
  getAccountHistory,
  calculateValueChange,
} from "@/lib/actions";

interface AccountsTableProps {
  accounts: Account[];
  monthlyData: Record<string, MonthlyEntry[]>;
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
  onDeleteAccount,
  onUpdateMonthlyEntry,
  onAddNewMonth,
}: AccountsTableProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [editingValues, setEditingValues] = useState<
    Record<string, Record<string, any>>
  >({});
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<ValueTimePeriod>("3M");
  const [currentValues, setCurrentValues] = useState<Record<string, number>>(
    {}
  );
  const [accountHistories, setAccountHistories] = useState<
    Record<string, MonthlyEntry[]>
  >({});
  const [valueChanges, setValueChanges] = useState<
    Record<string, { absoluteChange: number; percentageChange: number }>
  >({});
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Fetch current values, histories, and value changes for all accounts
  useEffect(() => {
    async function fetchAccountData() {
      const values: Record<string, number> = {};
      const histories: Record<string, MonthlyEntry[]> = {};
      const changes: Record<
        string,
        { absoluteChange: number; percentageChange: number }
      > = {};

      for (const account of accounts) {
        const [value, history, change] = await Promise.all([
          getCurrentValue(account.id),
          getAccountHistory(account.id),
          calculateValueChange(account.id, selectedTimePeriod),
        ]);
        values[account.id] = value;
        histories[account.id] = history;
        changes[account.id] = change;
      }

      setCurrentValues(values);
      setAccountHistories(histories);
      setValueChanges(changes);
    }
    fetchAccountData();
  }, [accounts, selectedTimePeriod]);

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

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
            isExpanded={expandedAccounts.has(account.id)}
            onToggle={toggleAccount}
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
