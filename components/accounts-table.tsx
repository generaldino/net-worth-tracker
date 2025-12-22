"use client";

import { useState, useEffect, useMemo } from "react";
import {
  type Account,
  type MonthlyEntry,
  type ValueTimePeriod,
  accountTypes,
  accountCategories,
} from "@/lib/types";
import { AccountRow } from "./accounts/account-row";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { TimePeriodSelector } from "./accounts/TimePeriodSelector";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AccountSelector } from "@/components/charts/controls/account-selector";
import { AccountTypeSelector } from "@/components/charts/controls/account-type-selector";
import { CategorySelector } from "@/components/charts/controls/category-selector";
import { CurrencySelector } from "@/components/currency-selector";
import type { Currency } from "@/lib/fx-rates";
import { useExchangeRates } from "@/contexts/exchange-rates-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountsTableProps {
  accounts: Account[];
  monthlyData: Record<string, MonthlyEntry[]>;
  currentValues: Record<string, number>;
  accountHistories: Record<string, MonthlyEntry[]>;
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

// Client-side function to calculate value change
function calculateValueChangeClient(
  history: MonthlyEntry[],
  timePeriod: ValueTimePeriod
): { absoluteChange: number; percentageChange: number } {
  if (history.length === 0) {
    return { absoluteChange: 0, percentageChange: 0 };
  }

  const currentValue = Number(history[0].endingBalance);
  let previousValue: number;

  switch (timePeriod) {
    case "1M":
      previousValue = history[1] ? Number(history[1].endingBalance) : 0;
      break;
    case "3M":
      previousValue = history[3] ? Number(history[3].endingBalance) : 0;
      break;
    case "6M":
      previousValue = history[6] ? Number(history[6].endingBalance) : 0;
      break;
    case "1Y":
      previousValue = history[12] ? Number(history[12].endingBalance) : 0;
      break;
    case "YTD":
      const currentYear = new Date().getFullYear();
      const ytdEntry = history.find((entry) =>
        entry.month.startsWith(`${currentYear}-01`)
      );
      previousValue = ytdEntry ? Number(ytdEntry.endingBalance) : 0;
      break;
    case "ALL":
    default:
      previousValue = history[history.length - 1]
        ? Number(history[history.length - 1].endingBalance)
        : 0;
  }

  const absoluteChange = currentValue - previousValue;
  const percentageChange =
    previousValue === 0 ? 0 : (absoluteChange / previousValue) * 100;

  return { absoluteChange, percentageChange };
}

export function AccountsTable({
  accounts,
  monthlyData,
  currentValues,
  accountHistories,
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

  // Filter states
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    accounts.map((account) => account.id)
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(accountTypes);
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(accountCategories);
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("GBP");
  const { fetchRates } = useExchangeRates();

  // Get unique owners from accounts
  const owners = Array.from(new Set(accounts.map((account) => account.owner)));

  // Collect all unique months from all account histories
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    accounts.forEach((account) => {
      const history = accountHistories[account.id] || [];
      history.forEach((entry) => {
        months.add(entry.month); // entry.month is already in "YYYY-MM" format
      });
    });
    return Array.from(months);
  }, [accounts, accountHistories]);

  // Fetch all needed exchange rates when currency changes or component mounts
  // The fetchRates function will automatically include the latest rate
  useEffect(() => {
    fetchRates(uniqueMonths);
  }, [displayCurrency, uniqueMonths, fetchRates]);

  // Calculate value changes based on selected time period (derived state)
  const calculatedValueChanges = Object.fromEntries(
    accounts.map((account) => [
      account.id,
      calculateValueChangeClient(
        accountHistories[account.id] || [],
        selectedTimePeriod
      ),
    ])
  );

  // Filter accounts based on selected filters
  const filteredAccounts = accounts.filter((account) => {
    // Filter by closed status
    if (!showClosedAccounts && account.isClosed) {
      return false;
    }

    // Filter by selected accounts
    if (selectedAccounts.length > 0 && !selectedAccounts.includes(account.id)) {
      return false;
    }

    // Filter by selected types
    if (selectedTypes.length > 0 && !selectedTypes.includes(account.type)) {
      return false;
    }

    // Filter by selected categories
    if (
      selectedCategories.length > 0 &&
      !selectedCategories.includes(account.category || "Uncategorized")
    ) {
      return false;
    }

    // Filter by selected owner
    if (selectedOwner !== "all" && account.owner !== selectedOwner) {
      return false;
    }

    return true;
  });

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
      <div className="flex flex-col gap-4">
        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <AccountSelector
              accounts={accounts}
              selectedAccounts={selectedAccounts}
              onAccountsChange={setSelectedAccounts}
            />
            <AccountTypeSelector
              selectedTypes={selectedTypes}
              onTypesChange={setSelectedTypes}
            />
            <CategorySelector
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />
            <Select value={selectedOwner} onValueChange={setSelectedOwner}>
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Owners</SelectItem>
                {owners.map((owner) => (
                  <SelectItem key={owner} value={owner}>
                    {owner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TimePeriodSelector
              selectedTimePeriod={selectedTimePeriod}
              onTimePeriodChange={setSelectedTimePeriod}
            />
          </div>
        </div>

        {/* Additional Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <CurrencySelector
              value={displayCurrency}
              onValueChange={setDisplayCurrency}
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

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredAccounts.length} of {accounts.length} accounts
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
              calculatedValueChanges[account.id] || {
                absoluteChange: 0,
                percentageChange: 0,
              }
            }
            history={accountHistories[account.id] || []}
            editingValues={editingValues}
            monthlyData={monthlyData}
            selectedTimePeriod={selectedTimePeriod}
            displayCurrency={displayCurrency}
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

      {/* No results message */}
      {filteredAccounts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No accounts match the current filters. Try adjusting your filter
          criteria.
        </div>
      )}

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
