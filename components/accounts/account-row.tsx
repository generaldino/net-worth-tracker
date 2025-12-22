"use client";

import { ChevronDown, ChevronRight, Archive } from "lucide-react";
import { type Account, type MonthlyEntry } from "@/lib/types";
import { AccountTypeBadge } from "./account-type-badge";
import { AccountActions } from "./account-actions";
import { ValueChangeDisplay } from "./value-change-display";
import { MonthlyHistoryTable } from "./monthly-history-table";
import { AddMonthDialog } from "@/components/add-month-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useMasking } from "@/contexts/masking-context";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { formatCurrencyAmount, getCurrencySymbol } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";

interface AccountRowProps {
  account: Account;
  currentValue: number;
  valueChange: {
    absoluteChange: number;
    percentageChange: number;
  };
  history: MonthlyEntry[];
  editingValues: Record<
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
  >;
  monthlyData: Record<string, MonthlyEntry[]>;
  selectedTimePeriod: string;
  displayCurrency: Currency;
  onValueChange: (
    accountId: string,
    month: string,
    field: string,
    value: string
  ) => void;
  onSave: (accountId: string, month: string) => void;
  onEdit: (accountId: string, month: string, entry: MonthlyEntry) => void;
  onAddMonth: (accountId: string, month: string, entry: MonthlyEntry) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
}

export function AccountRow({
  account,
  currentValue,
  valueChange,
  history,
  editingValues,
  selectedTimePeriod,
  onValueChange,
  onSave,
  onEdit,
  onAddMonth,
  onEditAccount,
  onDeleteAccount,
  displayCurrency,
}: AccountRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { formatCurrency } = useMasking();
  const accountCurrency = (account.currency || "GBP") as Currency;

  const { convertedAmount: convertedCurrentValue } = useCurrencyConversion(
    currentValue,
    accountCurrency,
    displayCurrency
  );

  const { convertedAmount: convertedAbsoluteChange } = useCurrencyConversion(
    valueChange.absoluteChange,
    accountCurrency,
    displayCurrency
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        className={cn(
          "border rounded-lg bg-card",
          account.isClosed && "opacity-60"
        )}
      >
        <CollapsibleTrigger asChild>
          <div className="w-full p-3 sm:p-4 hover:bg-muted/50 cursor-pointer">
            {/* Mobile Layout */}
            <div className="block sm:hidden">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mt-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-1" />
                  )}
                  <div>
                    <div className="font-medium text-base flex items-center gap-2">
                      {account.name}
                      {account.isClosed && (
                        <Archive className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <AccountTypeBadge account={account} />
                      <span className="text-sm text-muted-foreground">
                        {account.owner}
                      </span>
                    </div>
                  </div>
                </div>
                <AccountActions
                  account={account}
                  onEdit={onEditAccount}
                  onDelete={onDeleteAccount}
                  stopPropagation
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                <div>
                  <span className="text-muted-foreground">Current Value:</span>
                  <div className="font-medium text-lg">
                    {formatCurrencyAmount(
                      convertedCurrentValue,
                      displayCurrency
                    )}
                  </div>
                  {accountCurrency !== displayCurrency && (
                    <div className="text-xs text-muted-foreground mt-1">
                      ({formatCurrencyAmount(currentValue, accountCurrency)})
                    </div>
                  )}
                </div>
                <ValueChangeDisplay
                  absoluteChange={convertedAbsoluteChange}
                  percentageChange={valueChange.percentageChange}
                  label={`${selectedTimePeriod} Change:`}
                  currency={displayCurrency}
                />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <div className="grid grid-cols-6 gap-4 flex-1 items-center">
                  <div className="font-medium flex items-center gap-2">
                    {account.name}
                    {account.isClosed && (
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-muted-foreground">{account.owner}</div>
                  <AccountTypeBadge account={account} />
                  <div className="font-medium">
                    {formatCurrencyAmount(
                      convertedCurrentValue,
                      displayCurrency
                    )}
                    {accountCurrency !== displayCurrency && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({getCurrencySymbol(accountCurrency)}
                        {formatCurrency(currentValue)})
                      </span>
                    )}
                  </div>
                  <ValueChangeDisplay
                    absoluteChange={convertedAbsoluteChange}
                    percentageChange={valueChange.percentageChange}
                    currency={displayCurrency}
                  />
                </div>
              </div>
              <AccountActions
                account={account}
                onEdit={onEditAccount}
                onDelete={onDeleteAccount}
                stopPropagation
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 sm:px-4 pb-4 border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 mt-3">
              <h4 className="font-medium">Monthly History</h4>
              <AddMonthDialog
                account={account}
                onAddMonth={(month, entry) =>
                  onAddMonth(account.id, month, entry)
                }
              />
            </div>

            <MonthlyHistoryTable
              history={history}
              editingValues={editingValues}
              accountId={account.id}
              accountCurrency={accountCurrency}
              displayCurrency={displayCurrency}
              onValueChange={onValueChange}
              onSave={onSave}
              onEdit={onEdit}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
