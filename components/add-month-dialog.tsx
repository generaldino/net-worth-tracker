"use client";

import { useState, useEffect } from "react";
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
import { shouldShowIncomeExpenditure } from "@/lib/account-helpers";
import { getFieldExplanation } from "@/lib/field-explanations";
import { InfoButton } from "@/components/ui/info-button";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    async function fetchCurrentValue() {
      const value = await getCurrentValue(account.id);
      setCurrentValue(value);
    }
    fetchCurrentValue();
  }, [account.id]);

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
      const result = await addMonthlyEntry(account.id, month, {
        endingBalance: Number.parseFloat(endingBalance) || 0,
        cashIn: Number.parseFloat(cashIn) || 0,
        cashOut: Number.parseFloat(cashOut) || 0,
        income: shouldShowIncomeExpenditure(account.type)
          ? Number.parseFloat(income) || 0
          : 0,
        expenditure: shouldShowIncomeExpenditure(account.type)
          ? Number.parseFloat(expenditure) || 0
          : 0,
      });

      if (result.success) {
        const entry: MonthlyEntry = {
          accountId: account.id,
          monthKey: month,
          month,
          endingBalance: Number.parseFloat(endingBalance) || 0,
          cashIn: Number.parseFloat(cashIn) || 0,
          cashOut: Number.parseFloat(cashOut) || 0,
          income: shouldShowIncomeExpenditure(account.type)
            ? Number.parseFloat(income) || 0
            : 0,
          expenditure: shouldShowIncomeExpenditure(account.type)
            ? Number.parseFloat(expenditure) || 0
            : 0,
          cashFlow:
            (Number.parseFloat(cashIn) || 0) -
            (Number.parseFloat(cashOut) || 0),
          accountGrowth: 0, // This will be calculated by the server
        };

        onAddMonth(month, entry);

        // Reset form and close dialog
        setMonth("");
        setEndingBalance("");
        setCashIn("");
        setCashOut("");
        setIncome("");
        setExpenditure("");
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
            Enter the month-end balance and cash flows for this account.
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
              placeholder="0"
            />
          </div>
          {shouldShowIncomeExpenditure(account.type) && (
            <>
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
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="expenditure">Expenditure</Label>
                  {(() => {
                    const explanation = getFieldExplanation(
                      account.type,
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
                <Input
                  id="expenditure"
                  type="number"
                  value={expenditure}
                  onChange={(e) => setExpenditure(e.target.value)}
                  placeholder="0"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="cash-in">Cash In</Label>
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
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="cash-out">Cash Out</Label>
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
              onChange={(e) => setCashOut(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
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
