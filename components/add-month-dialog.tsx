"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Account, type MonthlyEntry } from "@/lib/types";
import { Plus } from "lucide-react";
import { addMonthlyEntry, getCurrentValue } from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";
import { getCurrencySymbol, formatCurrencyAmount } from "@/lib/fx-rates";
import { shouldShowIncome, getFieldLabels, computeExpenditure } from "@/lib/account-helpers";
import { getFieldExplanation } from "@/lib/field-explanations";
import { InfoButton } from "@/components/ui/info-button";
import {
  getMonthDataHealthContext,
  type DataHealthMonthContext,
} from "@/app/actions/data-health";
import { computeLiveWarnings } from "@/lib/data-health";
import { WarningList } from "@/components/data-health/warning-list";

interface AddMonthDialogProps {
  account: Account;
  onAddMonth: (month: string, entry: MonthlyEntry) => void;
}

export function AddMonthDialog({ account, onAddMonth }: AddMonthDialogProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [endingBalance, setEndingBalance] = useState("");
  const [cashIn, setCashIn] = useState("");
  const [cashOut, setCashOut] = useState("");
  const [income, setIncome] = useState("");
  const [expenditure, setExpenditure] = useState("");
  const [expenditureEdited, setExpenditureEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);
  const [healthContext, setHealthContext] =
    useState<DataHealthMonthContext | null>(null);

  const { contributionsLabel, withdrawalsLabel } = getFieldLabels(account.type);
  const showIncome = shouldShowIncome(account.type);
  const showExpenditure =
    account.type === "Current" || account.type === "Credit_Card";

  useEffect(() => {
    async function fetchCurrentValue() {
      const value = await getCurrentValue(account.id);
      setCurrentValue(value);
    }
    fetchCurrentValue();
  }, [account.id]);

  useEffect(() => {
    if (!open || !month) {
      setHealthContext(null);
      return;
    }
    let cancelled = false;
    getMonthDataHealthContext(month).then((ctx) => {
      if (!cancelled) setHealthContext(ctx);
    });
    return () => {
      cancelled = true;
    };
  }, [open, month]);

  const liveWarnings = useMemo(() => {
    if (!healthContext || !month) return [];
    const cashInN = Number.parseFloat(cashIn) || 0;
    const cashOutN = Number.parseFloat(cashOut) || 0;
    const endingN = Number.parseFloat(endingBalance) || 0;
    const incomeN = showIncome ? Number.parseFloat(income) || 0 : 0;

    const draftEntry = {
      accountId: account.id,
      month,
      endingBalance: endingN,
      cashIn: cashInN,
      cashOut: cashOutN,
      income: incomeN,
    };

    const others = healthContext.monthEntriesByAccount
      .filter((e) => e.accountId !== account.id)
      .map((e) => e.entry);

    return computeLiveWarnings({
      entries: [draftEntry, ...others],
      accounts: healthContext.accounts,
      previousEntries: healthContext.previousEntries,
      fxRate: healthContext.fxRate,
    }).filter((w) => w.accountId === account.id);
  }, [
    healthContext,
    month,
    cashIn,
    cashOut,
    endingBalance,
    income,
    showIncome,
    account.id,
  ]);

  const handleSubmit = async () => {
    if (!month) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a month",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const cashOutValue = Number.parseFloat(cashOut) || 0;
      const cashInValue = Number.parseFloat(cashIn) || 0;
      const incomeValue = showIncome ? Number.parseFloat(income) || 0 : 0;
      const expenditureOverride =
        showExpenditure && expenditureEdited
          ? Number.parseFloat(expenditure) || 0
          : undefined;
      const expenditureStored =
        expenditureOverride ??
        computeExpenditure(account.type, cashOutValue);

      const result = await addMonthlyEntry(account.id, month, {
        endingBalance: Number.parseFloat(endingBalance) || 0,
        cashIn: cashInValue,
        cashOut: cashOutValue,
        income: incomeValue,
        expenditure: expenditureOverride,
        internalTransfersOut: 0,
        debtPayments: 0,
      });

      if (result.success) {
        const entry: MonthlyEntry = {
          accountId: account.id,
          monthKey: month,
          month,
          endingBalance: Number.parseFloat(endingBalance) || 0,
          cashIn: cashInValue,
          cashOut: cashOutValue,
          income: incomeValue,
          expenditure: expenditureStored,
          internalTransfersOut: 0,
          debtPayments: 0,
          cashFlow: cashInValue - cashOutValue,
          accountGrowth: 0,
        };

        onAddMonth(month, entry);

        // Reset form and close dialog
        setMonth("");
        setEndingBalance("");
        setCashIn("");
        setCashOut("");
        setIncome("");
        setExpenditure("");
        setExpenditureEdited(false);
        setOpen(false);

        toast({
          title: "Success",
          description: "Monthly entry added successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error || "Failed to add monthly entry",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current month in YYYY-MM format for the month input max value
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Month
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Month for {account.name}</DialogTitle>
          <DialogDescription>
            Enter the month-end balance and any cash movements for this account.
            <br />
            <span className="text-sm text-muted-foreground">
              Current balance:{" "}
              {formatCurrencyAmount(currentValue, account.currency || "GBP")}
            </span>
            <br />
            <span className="text-xs text-muted-foreground font-medium">
              All values should be in {account.currency || "GBP"}{" "}
              {getCurrencySymbol(account.currency || "GBP")}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              max={currentMonth}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="ending-balance">Ending Balance</Label>
              {(() => {
                const explanation = getFieldExplanation(
                  account.type,
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
            <Input
              id="ending-balance"
              type="number"
              value={endingBalance}
              onChange={(e) => setEndingBalance(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="0"
            />
          </div>
          {showIncome && (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="income">Income</Label>
                {(() => {
                  const explanation = getFieldExplanation(
                    account.type,
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
              <Input
                id="income"
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="0"
              />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="cash-in">{contributionsLabel}</Label>
              {(() => {
                const explanation = getFieldExplanation(account.type, "cashIn");
                return explanation ? (
                  <InfoButton
                    title={explanation.title}
                    description={explanation.description}
                  />
                ) : null;
              })()}
            </div>
            <Input
              id="cash-in"
              type="number"
              value={cashIn}
              onChange={(e) => setCashIn(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="cash-out">{withdrawalsLabel}</Label>
              {(() => {
                const explanation = getFieldExplanation(
                  account.type,
                  "cashOut"
                );
                return explanation ? (
                  <InfoButton
                    title={explanation.title}
                    description={explanation.description}
                  />
                ) : null;
              })()}
            </div>
            <Input
              id="cash-out"
              type="number"
              value={cashOut}
              onChange={(e) => {
                const next = e.target.value;
                setCashOut(next);
                if (showExpenditure && !expenditureEdited) {
                  setExpenditure(next);
                }
              }}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="0"
            />
          </div>
          {showExpenditure && (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label htmlFor="expenditure">Expenditure</Label>
                {(() => {
                  const explanation = getFieldExplanation(
                    account.type,
                    "expenditure",
                  );
                  return explanation ? (
                    <InfoButton
                      title={explanation.title}
                      description={explanation.description}
                    />
                  ) : null;
                })()}
                {expenditureEdited ? (
                  <button
                    type="button"
                    onClick={() => {
                      setExpenditure(cashOut);
                      setExpenditureEdited(false);
                    }}
                    className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    Reset to {withdrawalsLabel.toLowerCase()}
                  </button>
                ) : (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    Auto — tracks {withdrawalsLabel.toLowerCase()}
                  </span>
                )}
              </div>
              <Input
                id="expenditure"
                type="number"
                value={expenditureEdited ? expenditure : cashOut}
                onChange={(e) => {
                  setExpenditure(e.target.value);
                  setExpenditureEdited(true);
                }}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="0"
              />
              {expenditureEdited &&
                (Number.parseFloat(cashOut) || 0) >
                  (Number.parseFloat(expenditure) || 0) && (
                  <p className="text-[11px] text-muted-foreground">
                    Transfer amount: {" "}
                    {formatCurrencyAmount(
                      (Number.parseFloat(cashOut) || 0) -
                        (Number.parseFloat(expenditure) || 0),
                      account.currency || "GBP",
                    )}{" "}
                    (excluded from savings rate).
                  </p>
                )}
            </div>
          )}
        </div>
        {liveWarnings.length > 0 && (
          <div className="pb-3">
            <WarningList warnings={liveWarnings} showAccount={false} showMonth={false} />
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Month"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
