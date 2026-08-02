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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IncomeStreamsEditor } from "@/components/income-streams-editor";
import {
  getMonthIncomeData,
  saveIncomeStreams,
  type IncomeStreamDraft,
} from "@/app/actions/income";
import { toast } from "@/components/ui/use-toast";

interface IncomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMonth?: string;
  onSaved?: () => void;
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function IncomeDialog({
  open,
  onOpenChange,
  defaultMonth,
  onSaved,
}: IncomeDialogProps) {
  const [month, setMonth] = useState(defaultMonth ?? currentMonth());
  const [streams, setStreams] = useState<IncomeStreamDraft[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) setMonth(defaultMonth ?? currentMonth());
  }, [open, defaultMonth]);

  useEffect(() => {
    if (!open || !month) return;
    let cancelled = false;
    setIsLoading(true);
    getMonthIncomeData(month)
      .then((data) => {
        if (cancelled) return;
        if (data.streams.length > 0) {
          setStreams(
            data.streams.map((s) => ({
              name: s.name,
              amount: s.amount,
              currency: s.currency,
            })),
          );
        } else if (data.suggestedNames.length > 0) {
          setStreams(
            data.suggestedNames.map((name) => ({
              name,
              amount: 0,
              currency: "GBP" as const,
            })),
          );
        } else {
          setStreams([{ name: "Salary", amount: 0, currency: "GBP" }]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, month]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const result = await saveIncomeStreams(month, streams);
      if (result.success) {
        toast({
          title: "Income saved",
          description: `Saved ${result.savedCount} income stream${result.savedCount === 1 ? "" : "s"} for ${formatMonthLabel(month)}.`,
        });
        onSaved?.();
        onOpenChange(false);
      } else {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: result.error ?? "Income could not be saved.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unexpected error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Income</DialogTitle>
          <DialogDescription>
            Record the income you earned this month. Add a line for each source
            &mdash; salary, freelance, rental, and so on.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
            <Label htmlFor="income-month" className="sm:text-right">
              Month
            </Label>
            <Input
              id="income-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="sm:col-span-3"
            />
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading income…</p>
          ) : (
            <IncomeStreamsEditor streams={streams} onChange={setStreams} />
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
          <Button onClick={handleSubmit} disabled={isSaving || isLoading}>
            {isSaving ? "Saving…" : "Save Income"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
