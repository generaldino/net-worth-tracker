"use client";

import { ChevronDown, ChevronRight, Archive, GripVertical } from "lucide-react";
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
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useMasking } from "@/contexts/masking-context";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
        income: string;
        internalTransfersOut: string;
        debtPayments: string;
        expenditure: string;
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
  isFirst?: boolean;
  isLast?: boolean;
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
  isFirst = false,
  isLast = false,
}: AccountRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isMasked } = useMasking();
  const accountCurrency = (account.currency || "GBP") as Currency;

  // If displayCurrency matches accountCurrency, no conversion needed
  const needsConversion = displayCurrency !== accountCurrency;

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

  // Drag and drop - only enable on client to avoid hydration issues
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account.id, disabled: !isClient });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div
        ref={setNodeRef}
        style={style}
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
                  {isClient && (
                    <div
                      {...attributes}
                      {...listeners}
                      className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>
                  )}
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
                    <div className="flex flex-wrap gap-2 mt-1 items-center">
                      <AccountTypeBadge account={account} />
                      <span className="text-sm text-muted-foreground">
                        {account.owner}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {accountCurrency}
                      </span>
                    </div>
                  </div>
                </div>
                <AccountActions
                  account={account}
                  onEdit={onEditAccount}
                  onDelete={onDeleteAccount}
                  stopPropagation
                  isFirst={isFirst}
                  isLast={isLast}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                <div>
                  <span className="text-muted-foreground">Current Value:</span>
                  <div className="font-medium text-lg">
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(
                          convertedCurrentValue,
                          displayCurrency
                        )}
                  </div>
                  {needsConversion && !isMasked && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrencyAmount(currentValue, accountCurrency)}
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
            <div className="hidden sm:flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                {isClient && (
                  <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground shrink-0"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                )}
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
                <div className="grid grid-cols-7 gap-2 sm:gap-4 flex-1 items-center min-w-0">
                  <div className="font-medium flex items-center gap-2 min-w-0">
                    <span className="truncate">{account.name}</span>
                    {account.isClosed && (
                      <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm truncate">
                    {account.owner}
                  </div>
                  <div className="min-w-0">
                    <AccountTypeBadge account={account} />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {accountCurrency}
                  </div>
                  <div className="font-medium min-w-0">
                    {isMasked ? (
                      "••••••"
                    ) : (
                      <div className="flex flex-col">
                        <div className="truncate">
                          {formatCurrencyAmount(
                            convertedCurrentValue,
                            displayCurrency
                          )}
                        </div>
                        {needsConversion && (
                          <div className="text-xs text-muted-foreground truncate">
                            {formatCurrencyAmount(
                              currentValue,
                              accountCurrency
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <ValueChangeDisplay
                      absoluteChange={convertedAbsoluteChange}
                      percentageChange={valueChange.percentageChange}
                      currency={displayCurrency}
                    />
                  </div>
                </div>
              </div>
              <AccountActions
                account={account}
                onEdit={onEditAccount}
                onDelete={onDeleteAccount}
                stopPropagation
                isFirst={isFirst}
                isLast={isLast}
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
              editingValues={
                editingValues as unknown as Record<
                  string,
                  Record<
                    string,
                    {
                      endingBalance: string;
                      cashIn: string;
                      cashOut: string;
                      income: string;
                      internalTransfersOut: string;
                      debtPayments: string;
                      expenditure: string;
                    }
                  >
                >
              }
              accountId={account.id}
              accountType={account.type}
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
