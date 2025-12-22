"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Save } from "lucide-react";
import { type MonthlyEntry } from "@/lib/types";
import { useMasking } from "@/contexts/masking-context";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";

interface MonthlyHistoryRowProps {
  entry: MonthlyEntry;
  isEditing: boolean;
  accountCurrency: Currency;
  displayCurrency: Currency;
  editingValues: {
    endingBalance: string;
    cashIn: string;
    cashOut: string;
    workIncome: string;
  };
  onValueChange: (field: string, value: string) => void;
  onSave: () => void;
  onEdit: () => void;
  isMobile?: boolean;
}

export function MonthlyHistoryRow({
  entry,
  isEditing,
  accountCurrency,
  displayCurrency,
  editingValues,
  onValueChange,
  onSave,
  onEdit,
  isMobile = false,
}: MonthlyHistoryRowProps) {
  const { formatCurrency, isMasked } = useMasking();
  
  // Convert values using historical rates for the entry's month
  const { convertedAmount: convertedBalance } = useCurrencyConversion(
    entry.endingBalance,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedWorkIncome } = useCurrencyConversion(
    entry.workIncome || 0,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedCashIn } = useCurrencyConversion(
    entry.cashIn,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedCashOut } = useCurrencyConversion(
    entry.cashOut,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedCashFlow } = useCurrencyConversion(
    entry.cashFlow,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedGrowth } = useCurrencyConversion(
    entry.accountGrowth,
    accountCurrency,
    displayCurrency,
    entry.month
  );

  if (isMobile) {
    return (
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex justify-between items-start mb-3">
          <div className="font-medium">{entry.month}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={isEditing ? onSave : onEdit}
            className="h-8 w-8 p-0"
          >
            {isEditing ? (
              <Save className="h-4 w-4" />
            ) : (
              <Edit className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground block mb-1">Balance:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.endingBalance}
                onChange={(e) => onValueChange("endingBalance", e.target.value)}
                className="h-8"
              />
            ) : (
              <div className="font-medium">
                {isMasked ? (
                  "••••••"
                ) : (
                  formatCurrencyAmount(convertedBalance, displayCurrency)
                )}
              </div>
            )}
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">
              Work Income:
            </span>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.workIncome}
                onChange={(e) => onValueChange("workIncome", e.target.value)}
                className="h-8"
              />
            ) : (
              <div className="font-medium">
                {isMasked ? (
                  "••••••"
                ) : (
                  formatCurrencyAmount(convertedWorkIncome, displayCurrency)
                )}
              </div>
            )}
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Growth:</span>
            <div
              className={
                entry.accountGrowth >= 0
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {isMasked ? (
                "••••••"
              ) : (
                <>
                  {convertedGrowth >= 0 ? "+" : ""}
                  {formatCurrencyAmount(convertedGrowth, displayCurrency)}
                </>
              )}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Cash In:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.cashIn}
                onChange={(e) => onValueChange("cashIn", e.target.value)}
                className="h-8"
              />
            ) : (
              <div className="font-medium">
                {isMasked ? (
                  "••••••"
                ) : (
                  formatCurrencyAmount(convertedCashIn, displayCurrency)
                )}
              </div>
            )}
          </div>
          <div>
            <span className="text-muted-foreground block mb-1">Cash Out:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.cashOut}
                onChange={(e) => onValueChange("cashOut", e.target.value)}
                className="h-8"
              />
            ) : (
              <div className="font-medium">
                {isMasked ? (
                  "••••••"
                ) : (
                  formatCurrencyAmount(convertedCashOut, displayCurrency)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr>
      <td>{entry.month}</td>
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.endingBalance}
            onChange={(e) => onValueChange("endingBalance", e.target.value)}
            className="w-[120px]"
          />
        ) : (
          isMasked
            ? "••••••"
            : formatCurrencyAmount(convertedBalance, displayCurrency)
        )}
      </td>
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.workIncome}
            onChange={(e) => onValueChange("workIncome", e.target.value)}
            className="w-[100px]"
          />
        ) : (
          isMasked
            ? "••••••"
            : formatCurrencyAmount(convertedWorkIncome, displayCurrency)
        )}
      </td>
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.cashIn}
            onChange={(e) => onValueChange("cashIn", e.target.value)}
            className="w-[100px]"
          />
        ) : (
          isMasked
            ? "••••••"
            : formatCurrencyAmount(convertedCashIn, displayCurrency)
        )}
      </td>
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.cashOut}
            onChange={(e) => onValueChange("cashOut", e.target.value)}
            className="w-[100px]"
          />
        ) : (
          isMasked
            ? "••••••"
            : formatCurrencyAmount(convertedCashOut, displayCurrency)
        )}
      </td>
      <td className={entry.cashFlow >= 0 ? "text-green-600" : "text-red-600"}>
        {isMasked ? (
          "••••••"
        ) : (
          <>
            {convertedCashFlow >= 0 ? "+" : ""}
            {formatCurrencyAmount(convertedCashFlow, displayCurrency)}
          </>
        )}
      </td>
      <td
        className={entry.accountGrowth >= 0 ? "text-green-600" : "text-red-600"}
      >
        {isMasked ? (
          "••••••"
        ) : (
          <>
            {convertedGrowth >= 0 ? "+" : ""}
            {formatCurrencyAmount(convertedGrowth, displayCurrency)}
          </>
        )}
      </td>
      <td>
        {isEditing ? (
          <Button variant="outline" size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}
