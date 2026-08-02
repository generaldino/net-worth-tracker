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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);
  const [healthContext, setHealthContext] =
    useState<DataHealthMonthContext | null>(null);

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
    const endingN = Number.parseFloat(endingBalance) || 0;

    // Balance-only entry: cash-flow fields are 0.
    const draftEntry = {
      accountId: account.id,
      month,
      endingBalance: endingN,
      cashIn: 0,
      cashOut: 0,
      income: 0,
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
  }, [healthContext, month, endingBalance, account.id]);

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
      const endingValue = Number.parseFloat(endingBalance) || 0;
      const result = await addMonthlyEntry(account.id, month, {
        endingBalance: endingValue,
      });

      if (result.success) {
        const entry: MonthlyEntry = {
          accountId: account.id,
          monthKey: month,
          month,
          endingBalance: endingValue,
          cashIn: 0,
          cashOut: 0,
          income: 0,
          expenditure: 0,
          internalTransfersOut: 0,
          debtPayments: 0,
          cashFlow: 0,
          accountGrowth: 0,
        };

        onAddMonth(month, entry);

        // Reset form and close dialog
        setMonth("");
        setEndingBalance("");
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
            Enter the account&rsquo;s value at the end of the month.
            <br />
            <span className="text-sm text-muted-foreground">
              Current balance:{" "}
              {formatCurrencyAmount(currentValue, account.currency || "GBP")}
            </span>
            <br />
            <span className="text-xs text-muted-foreground font-medium">
              Value should be in {account.currency || "GBP"}{" "}
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
