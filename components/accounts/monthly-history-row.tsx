"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Save } from "lucide-react";
import { type MonthlyEntry } from "@/lib/types";
import { useMasking } from "@/contexts/masking-context";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import type { AccountType } from "@/lib/types";
import { getFieldExplanation } from "@/lib/field-explanations";
import { InfoButton } from "@/components/ui/info-button";

interface MonthlyHistoryRowProps {
  entry: MonthlyEntry;
  isEditing: boolean;
  showIncomeExpenditure: boolean;
  accountType: AccountType;
  accountCurrency: Currency;
  displayCurrency: Currency;
  editingValues: {
    endingBalance: string;
    cashIn: string;
    cashOut: string;
    income: string;
    internalTransfersOut: string;
    debtPayments: string;
    expenditure: string;
  };
  onValueChange: (field: string, value: string) => void;
  onSave: () => void;
  onEdit: () => void;
  isMobile?: boolean;
}

export function MonthlyHistoryRow({
  entry,
  isEditing,
  showIncomeExpenditure,
  accountType,
  accountCurrency,
  displayCurrency,
  editingValues,
  onValueChange,
  onSave,
  onEdit,
  isMobile = false,
}: MonthlyHistoryRowProps) {
  const { isMasked } = useMasking();

  // Convert values using historical rates for the entry's month
  const { convertedAmount: convertedBalance } = useCurrencyConversion(
    entry.endingBalance,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedIncome } = useCurrencyConversion(
    entry.income || 0,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedExpenditure } = useCurrencyConversion(
    entry.expenditure || 0,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedInternalTransfersOut } = useCurrencyConversion(
    entry.internalTransfersOut || 0,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedDebtPayments } = useCurrencyConversion(
    entry.debtPayments || 0,
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
            <div className="flex items-center gap-1 mb-1">
              <span className="text-muted-foreground">Balance:</span>
              {(() => {
                const explanation = getFieldExplanation(
                  accountType,
                  "endingBalance"
                );
                return explanation ? (
                  <InfoButton
                    title={explanation.title}
                    description={explanation.description}
                  />
                ) : null;
              })()}
            </div>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.endingBalance}
                onChange={(e) => onValueChange("endingBalance", e.target.value)}
                className="h-8"
              />
            ) : (
              <div className="font-medium">
                {isMasked
                  ? "••••••"
                  : formatCurrencyAmount(convertedBalance, displayCurrency)}
              </div>
            )}
          </div>
          {showIncomeExpenditure && (
            <>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-muted-foreground">Income:</span>
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "income"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editingValues.income}
                    onChange={(e) => onValueChange("income", e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <div className="font-medium">
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(convertedIncome, displayCurrency)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-muted-foreground">Internal Transfers Out:</span>
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "internalTransfersOut"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editingValues.internalTransfersOut}
                    onChange={(e) => onValueChange("internalTransfersOut", e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <div className="font-medium">
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(convertedInternalTransfersOut, displayCurrency)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-muted-foreground">Debt Payments:</span>
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "debtPayments"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
                {isEditing ? (
                  <Input
                    type="number"
                    value={editingValues.debtPayments}
                    onChange={(e) => onValueChange("debtPayments", e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <div className="font-medium">
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(convertedDebtPayments, displayCurrency)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-muted-foreground">Expenditure (Computed):</span>
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "expenditure"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
                <div className="font-medium bg-muted px-2 py-1 rounded">
                  {isMasked
                    ? "••••••"
                    : formatCurrencyAmount(convertedExpenditure, displayCurrency)}
                </div>
              </div>
            </>
          )}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-muted-foreground">Growth:</span>
              {(() => {
                const explanation = getFieldExplanation(
                  accountType,
                  "accountGrowth"
                );
                return explanation ? (
                  <InfoButton
                    title={explanation.title}
                    description={explanation.description}
                  />
                ) : null;
              })()}
            </div>
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
            <div className="flex items-center gap-1 mb-1">
              <span className="text-muted-foreground">Cash In:</span>
              {(() => {
                const explanation = getFieldExplanation(accountType, "cashIn");
                return explanation ? (
                  <InfoButton
                    title={explanation.title}
                    description={explanation.description}
                  />
                ) : null;
              })()}
            </div>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.cashIn}
                onChange={(e) => onValueChange("cashIn", e.target.value)}
                className="h-8"
              />
            ) : (
              <div className="font-medium">
                {isMasked
                  ? "••••••"
                  : formatCurrencyAmount(convertedCashIn, displayCurrency)}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-muted-foreground">Cash Out:</span>
              {(() => {
                const explanation = getFieldExplanation(accountType, "cashOut");
                return explanation ? (
                  <InfoButton
                    title={explanation.title}
                    description={explanation.description}
                  />
                ) : null;
              })()}
            </div>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.cashOut}
                onChange={(e) => onValueChange("cashOut", e.target.value)}
                className="h-8"
              />
            ) : (
              <div className="font-medium">
                {isMasked
                  ? "••••••"
                  : formatCurrencyAmount(convertedCashOut, displayCurrency)}
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
        ) : isMasked ? (
          "••••••"
        ) : (
          formatCurrencyAmount(convertedBalance, displayCurrency)
        )}
      </td>
      {showIncomeExpenditure && (
        <>
          <td>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.income}
                onChange={(e) => onValueChange("income", e.target.value)}
                className="w-[100px]"
              />
            ) : isMasked ? (
              "••••••"
            ) : (
              formatCurrencyAmount(convertedIncome, displayCurrency)
            )}
          </td>
          <td>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.internalTransfersOut}
                onChange={(e) => onValueChange("internalTransfersOut", e.target.value)}
                className="w-[100px]"
              />
            ) : isMasked ? (
              "••••••"
            ) : (
              formatCurrencyAmount(convertedInternalTransfersOut, displayCurrency)
            )}
          </td>
          <td>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.debtPayments}
                onChange={(e) => onValueChange("debtPayments", e.target.value)}
                className="w-[100px]"
              />
            ) : isMasked ? (
              "••••••"
            ) : (
              formatCurrencyAmount(convertedDebtPayments, displayCurrency)
            )}
          </td>
          <td className="bg-muted/50">
            {isMasked ? (
              "••••••"
            ) : (
              formatCurrencyAmount(convertedExpenditure, displayCurrency)
            )}
          </td>
        </>
      )}
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.cashIn}
            onChange={(e) => onValueChange("cashIn", e.target.value)}
            className="w-[100px]"
          />
        ) : isMasked ? (
          "••••••"
        ) : (
          formatCurrencyAmount(convertedCashIn, displayCurrency)
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
        ) : isMasked ? (
          "••••••"
        ) : (
          formatCurrencyAmount(convertedCashOut, displayCurrency)
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
