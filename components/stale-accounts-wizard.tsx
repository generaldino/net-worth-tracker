"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InfoButton } from "@/components/ui/info-button";
import { toast } from "@/components/ui/use-toast";
import { addMonthlyEntry } from "@/lib/actions";
import { shouldShowIncomeExpenditure } from "@/lib/account-helpers";
import { getFieldExplanation } from "@/lib/field-explanations";
import { formatCurrencyAmount, getCurrencySymbol } from "@/lib/fx-rates";
import type { AccountType, StaleAccountsData } from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";

const accountTypeColors: Record<AccountType, string> = {
  Current:
    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  Savings:
    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30",
  Investment:
    "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30",
  Stock:
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
  Crypto:
    "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  Pension:
    "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
  Commodity:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  Stock_options:
    "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30",
  Credit_Card:
    "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
  Loan: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
  Asset:
    "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30",
};

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

interface StaleAccountsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staleAccountsData: StaleAccountsData;
  onComplete: () => void;
}

export function StaleAccountsWizard({
  open,
  onOpenChange,
  staleAccountsData,
  onComplete,
}: StaleAccountsWizardProps) {
  const entries = staleAccountsData.staleEntries;
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [savedCount, setSavedCount] = React.useState(0);
  const [skippedCount, setSkippedCount] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form state
  const [endingBalance, setEndingBalance] = React.useState("");
  const [cashIn, setCashIn] = React.useState("0");
  const [cashOut, setCashOut] = React.useState("0");
  const [income, setIncome] = React.useState("0");
  const [internalTransfersOut, setInternalTransfersOut] = React.useState("0");
  const [debtPayments, setDebtPayments] = React.useState("0");

  // Reset form when current entry changes
  React.useEffect(() => {
    if (currentIndex < entries.length) {
      const entry = entries[currentIndex];
      setEndingBalance(String(entry.previousBalance));
      setCashIn("0");
      setCashOut("0");
      setIncome("0");
      setInternalTransfersOut("0");
      setDebtPayments("0");
    }
  }, [currentIndex, entries]);

  // Reset wizard state when opened
  React.useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setSavedCount(0);
      setSkippedCount(0);
      setIsCompleted(false);
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
    if (savedCount > 0) {
      onComplete();
    }
  };

  const advanceOrFinish = () => {
    if (currentIndex >= entries.length - 1) {
      setIsCompleted(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSave = async () => {
    const entry = entries[currentIndex];
    setIsSaving(true);

    try {
      const result = await addMonthlyEntry(entry.account.id, entry.missingMonth, {
        endingBalance: Number(endingBalance) || 0,
        cashIn: Number(cashIn) || 0,
        cashOut: Number(cashOut) || 0,
        income: Number(income) || 0,
        internalTransfersOut: Number(internalTransfersOut) || 0,
        debtPayments: Number(debtPayments) || 0,
      });

      if (result.success) {
        setSavedCount((prev) => prev + 1);
        advanceOrFinish();
      } else if (result.error?.includes("already exists")) {
        toast({
          title: "Entry already exists",
          description: `${entry.account.name} already has data for ${formatMonthLabel(entry.missingMonth)}`,
        });
        advanceOrFinish();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to save entry",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    setSkippedCount((prev) => prev + 1);
    advanceOrFinish();
  };

  if (entries.length === 0) return null;

  const currentEntry = entries[currentIndex];
  const isCurrentAccount = currentEntry
    ? shouldShowIncomeExpenditure(currentEntry.account.type)
    : false;

  const computedExpenditure = isCurrentAccount
    ? Math.max(0, (Number(cashOut) || 0) - (Number(internalTransfersOut) || 0) - (Number(debtPayments) || 0))
    : 0;

  const progressPercent = isCompleted
    ? 100
    : ((currentIndex) / entries.length) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Monthly Data</DialogTitle>
          <DialogDescription>
            Fill in missing data for your accounts
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {!isCompleted && (
            <p className="text-xs text-muted-foreground">
              Entry {currentIndex + 1} of {entries.length} &mdash; {formatMonthLabel(currentEntry.missingMonth)}
            </p>
          )}
        </div>

        {isCompleted ? (
          <div className="py-6 text-center space-y-3">
            <p className="text-lg font-medium">All done!</p>
            <p className="text-sm text-muted-foreground">
              Updated <span className="font-semibold">{savedCount}</span> account{savedCount !== 1 ? "s" : ""}.
              {skippedCount > 0 && (
                <> <span className="font-semibold">{skippedCount}</span> skipped.</>
              )}
            </p>
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Account card */}
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{currentEntry.account.name}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${accountTypeColors[currentEntry.account.type] || ""}`}
                >
                  {currentEntry.account.type.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {currentEntry.account.currency}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentEntry.account.owner}
                </span>
              </div>

              {currentEntry.previousMonth && (
                <p className="text-xs text-muted-foreground">
                  Previous balance ({formatMonthLabel(currentEntry.previousMonth)}):{" "}
                  <span className="font-medium">
                    {formatCurrencyAmount(currentEntry.previousBalance, currentEntry.account.currency as Currency)}
                  </span>
                </p>
              )}

              {/* Form fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldInput
                  label="Ending Balance"
                  field="endingBalance"
                  accountType={currentEntry.account.type}
                  currency={currentEntry.account.currency as Currency}
                  value={endingBalance}
                  onChange={setEndingBalance}
                />
                <FieldInput
                  label="Cash In"
                  field="cashIn"
                  accountType={currentEntry.account.type}
                  currency={currentEntry.account.currency as Currency}
                  value={cashIn}
                  onChange={setCashIn}
                />
                <FieldInput
                  label="Cash Out"
                  field="cashOut"
                  accountType={currentEntry.account.type}
                  currency={currentEntry.account.currency as Currency}
                  value={cashOut}
                  onChange={setCashOut}
                />

                {isCurrentAccount && (
                  <>
                    <FieldInput
                      label="Income"
                      field="income"
                      accountType={currentEntry.account.type}
                      currency={currentEntry.account.currency as Currency}
                      value={income}
                      onChange={setIncome}
                    />
                    <FieldInput
                      label="Internal Transfers Out"
                      field="internalTransfersOut"
                      accountType={currentEntry.account.type}
                      currency={currentEntry.account.currency as Currency}
                      value={internalTransfersOut}
                      onChange={setInternalTransfersOut}
                    />
                    <FieldInput
                      label="Debt Payments"
                      field="debtPayments"
                      accountType={currentEntry.account.type}
                      currency={currentEntry.account.currency as Currency}
                      value={debtPayments}
                      onChange={setDebtPayments}
                    />
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Expenditure</Label>
                        {(() => {
                          const exp = getFieldExplanation(currentEntry.account.type, "expenditure");
                          return exp ? <InfoButton title={exp.title} description={exp.description} /> : null;
                        })()}
                      </div>
                      <Input
                        value={computedExpenditure.toFixed(0)}
                        disabled
                        className="h-8 text-sm bg-muted/50"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <DialogFooter className="flex-row gap-2 sm:gap-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                disabled={isSaving || currentIndex === 0}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                Skip
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving
                  ? "Saving..."
                  : currentIndex >= entries.length - 1
                    ? "Save & Finish"
                    : "Save & Next"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FieldInput({
  label,
  field,
  accountType,
  currency,
  value,
  onChange,
}: {
  label: string;
  field: string;
  accountType: AccountType;
  currency: Currency;
  value: string;
  onChange: (value: string) => void;
}) {
  const explanation = getFieldExplanation(
    accountType,
    field as "endingBalance" | "cashIn" | "cashOut" | "income" | "internalTransfersOut" | "debtPayments",
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <Label className="text-xs">{label}</Label>
        {explanation && (
          <InfoButton title={explanation.title} description={explanation.description} />
        )}
      </div>
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {getCurrencySymbol(currency)}
        </span>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-sm pl-7"
        />
      </div>
    </div>
  );
}
