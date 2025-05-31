"use client";

import { useState } from "react";
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
import { type Account, type MonthlyEntry, getCurrentValue } from "@/lib/data";
import { Plus } from "lucide-react";
import { addMonthlyEntry } from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";

interface AddMonthDialogProps {
  account: Account;
  monthlyData: Record<string, MonthlyEntry[]>;
  onAddMonth: (month: string, entry: MonthlyEntry) => void;
}

export function AddMonthDialog({
  account,
  monthlyData,
  onAddMonth,
}: AddMonthDialogProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState("");
  const [endingBalance, setEndingBalance] = useState("");
  const [cashIn, setCashIn] = useState("");
  const [cashOut, setCashOut] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentValue = getCurrentValue(account.id, monthlyData);

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
      });

      if (result.success) {
        const entry: MonthlyEntry = {
          accountId: account.id,
          monthKey: month,
          month,
          endingBalance: Number.parseFloat(endingBalance) || 0,
          cashIn: Number.parseFloat(cashIn) || 0,
          cashOut: Number.parseFloat(cashOut) || 0,
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
    } catch (error) {
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
      <DialogContent className="sm:max-w-[425px] mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Month for {account.name}</DialogTitle>
          <DialogDescription>
            Enter the month-end balance and cash flows for this account.
            <br />
            <span className="text-sm text-muted-foreground">
              Current balance: £{currentValue.toLocaleString()}
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
            <Label htmlFor="ending-balance">Ending Balance</Label>
            <Input
              id="ending-balance"
              type="number"
              value={endingBalance}
              onChange={(e) => setEndingBalance(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cash-in">Cash In</Label>
            <Input
              id="cash-in"
              type="number"
              value={cashIn}
              onChange={(e) => setCashIn(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cash-out">Cash Out</Label>
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
