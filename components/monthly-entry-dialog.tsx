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
import { CalendarIcon } from "lucide-react";
import { getCurrentValue } from "@/lib/actions";
import { getCurrencySymbol, formatCurrencyAmount } from "@/lib/fx-rates";

interface MonthlyEntryDialogProps {
  accounts: Account[];
  selectedMonth: string;
  existingEntries: MonthlyEntry[];
  onSaveEntries: (month: string, entries: MonthlyEntry[]) => void;
}

export function MonthlyEntryDialog({
  accounts,
  selectedMonth,
  existingEntries,
  onSaveEntries,
}: MonthlyEntryDialogProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [month, setMonth] = useState(selectedMonth);
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({});

  useEffect(() => {
    // Initialize entries with existing data or default values
    const initializeEntries = async () => {
      // Fetch current values for all accounts first
      const values = await Promise.all(
        accounts.map(async (account) => {
          const value = await getCurrentValue(account.id);
          return { accountId: account.id, value };
        })
      );
      const valuesMap = Object.fromEntries(
        values.map(({ accountId, value }) => [accountId, value])
      );
      setCurrentValues(valuesMap);
      
      // Then initialize entries with the fetched values
      const initialEntries = await Promise.all(
        accounts.map(async (account) => {
          const existingEntry = existingEntries.find(
            (e) => e.accountId === account.id
          );
          const endingBalance = existingEntry
            ? existingEntry.endingBalance
            : valuesMap[account.id] || 0;
          const cashIn = existingEntry ? existingEntry.cashIn : 0;
          const cashOut = existingEntry ? existingEntry.cashOut : 0;
          const workIncome = existingEntry ? existingEntry.workIncome : 0;
          return {
            accountId: account.id,
            monthKey: month,
            month,
            endingBalance,
            cashIn,
            cashOut,
            workIncome,
            cashFlow: cashIn - cashOut,
            accountGrowth: 0,
          };
        })
      );
      setEntries(initialEntries);
    };
    
    if (open) {
      initializeEntries();
    }
    setMonth(selectedMonth);
  }, [accounts, existingEntries, selectedMonth, open, month]);

  const handleEntryChange = (
    accountId: string,
    field: keyof MonthlyEntry,
    value: string
  ) => {
    const numValue =
      field === "accountId" ? accountId : Number.parseFloat(value) || 0;
    setEntries(
      entries.map((entry) =>
        entry.accountId === accountId ? { ...entry, [field]: numValue } : entry
      )
    );
  };

  const handleSubmit = () => {
    const entriesToSave = entries.map((entry) => ({
      accountId: entry.accountId,
      monthKey: entry.month,
      month: entry.month,
      endingBalance: entry.endingBalance,
      cashIn: entry.cashIn,
      cashOut: entry.cashOut,
      workIncome: entry.workIncome,
      cashFlow: entry.cashIn - entry.cashOut,
      accountGrowth: 0, // This will be calculated on the server
    }));
    onSaveEntries(month, entriesToSave);
    setOpen(false);
  };

  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <CalendarIcon className="mr-2 h-4 w-4" />
          Add Monthly Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Monthly Account Values</DialogTitle>
          <DialogDescription>
            Enter the ending balance and cash flows for each account for the
            selected month.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="month" className="sm:text-right">
              Month
            </Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="sm:col-span-3"
            />
          </div>

          <div className="space-y-4">
            {accounts.map((account) => {
              const entry = entries.find((e) => e.accountId === account.id);
              const currentValue = currentValues[account.id] || 0;

              return (
                <div
                  key={account.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{account.name}</h4>
                      <span className="text-xs text-muted-foreground">
                        Currency: {account.currency || "GBP"} {getCurrencySymbol(account.currency || "GBP")}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Current: {formatCurrencyAmount(currentValue, account.currency || "GBP")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-sm">Ending Balance</Label>
                      <Input
                        type="number"
                        value={entry?.endingBalance || 0}
                        onChange={(e) =>
                          handleEntryChange(
                            account.id.toString(),
                            "endingBalance",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Work Income</Label>
                      <Input
                        type="number"
                        value={entry?.workIncome || 0}
                        onChange={(e) =>
                          handleEntryChange(
                            account.id.toString(),
                            "workIncome",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Cash In</Label>
                      <Input
                        type="number"
                        value={entry?.cashIn || 0}
                        onChange={(e) =>
                          handleEntryChange(
                            account.id.toString(),
                            "cashIn",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Cash Out</Label>
                      <Input
                        type="number"
                        value={entry?.cashOut || 0}
                        onChange={(e) =>
                          handleEntryChange(
                            account.id.toString(),
                            "cashOut",
                            e.target.value
                          )
                        }
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>
            Save Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
