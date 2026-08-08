"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { supportedCurrencies } from "@/lib/types";
import { getCurrencySymbol } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import {
  createExpense,
  updateExpense,
  type ExpenseRow,
} from "@/app/actions/expenses";
import type { CategoryRow } from "@/app/actions/expense-categories";

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this expense; otherwise it creates one. */
  expense: ExpenseRow | null;
  categories: CategoryRow[];
  accounts: Array<{ id: string; name: string }>;
  defaultMonth?: string;
  onSaved: () => void;
}

const NO_CATEGORY = "__none__";
const NO_ACCOUNT = "__none__";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  categories,
  accounts,
  defaultMonth,
  onSaved,
}: ExpenseDialogProps) {
  const isEdit = expense !== null;

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("GBP");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [accountId, setAccountId] = useState<string>(NO_ACCOUNT);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setDate(expense.date);
      setAmount(String(expense.amount));
      setCurrency(expense.currency);
      setDescription(expense.description);
      setCategoryId(expense.categoryId ?? NO_CATEGORY);
      setAccountId(expense.accountId ?? NO_ACCOUNT);
    } else {
      // Default to the first of the selected month when it isn't the current one,
      // so adding to a past month doesn't silently land in today's month.
      const today = todayISO();
      setDate(
        defaultMonth && !today.startsWith(defaultMonth)
          ? `${defaultMonth}-01`
          : today,
      );
      setAmount("");
      setCurrency("GBP");
      setDescription("");
      setCategoryId(NO_CATEGORY);
      setAccountId(NO_ACCOUNT);
    }
  }, [open, expense, defaultMonth]);

  const amountNum = Number.parseFloat(amount);
  // New expenses must name their account — statement coverage depends on
  // attribution. Existing rows (pre-rule or import-era) stay editable as-is.
  const accountOk =
    isEdit || accounts.length === 0 || accountId !== NO_ACCOUNT;
  const canSave =
    date.length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum !== 0 &&
    description.trim().length > 0 &&
    accountOk &&
    !isSaving;

  const handleSave = async () => {
    setIsSaving(true);
    const input = {
      date,
      amount: amountNum,
      currency,
      description,
      categoryId: categoryId === NO_CATEGORY ? null : categoryId,
      accountId: accountId === NO_ACCOUNT ? null : accountId,
    };
    const result = isEdit
      ? await updateExpense(expense.id, input)
      : await createExpense(input);
    setIsSaving(false);

    if (result.success) {
      toast({
        title: isEdit ? "Expense updated" : "Expense added",
        description: description.trim(),
      });
      onSaved();
      onOpenChange(false);
    } else {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: result.error,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Record a one-off expense. Use a negative amount for a refund.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="expense-description">Description</Label>
            <Input
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Weekly shop"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="expense-date">Date</Label>
              <Input
                id="expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  placeholder="0.00"
                />
                <Select
                  value={currency}
                  onValueChange={(v) => setCurrency(v as Currency)}
                >
                  <SelectTrigger className="w-[76px]">
                    <SelectValue>{getCurrencySymbol(currency)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {supportedCurrencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {getCurrencySymbol(c)} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="expense-category">
                <SelectValue placeholder="Uncategorised" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>Uncategorised</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {accounts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="expense-account">
                Account{isEdit ? "" : " — which card or account paid?"}
              </Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="expense-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {isEdit && (
                    <SelectItem value={NO_ACCOUNT}>None</SelectItem>
                  )}
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? "Save changes" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
