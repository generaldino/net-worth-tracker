"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { colorVariantsBackground } from "@/lib/color-variants";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import {
  saveCategoryTargets,
  type CategoryRow,
} from "@/app/actions/expense-categories";

interface TargetsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryRow[];
  /** 3-month average spend per category id (GBP), used as hints and autofill. */
  averages: Record<string, number>;
  /** This month's income (GBP), for the planned-vs-income line. */
  incomeTotalGbp: number;
  onSaved: () => void;
}

function swatch(color: string) {
  return (
    colorVariantsBackground[color as keyof typeof colorVariantsBackground] ??
    colorVariantsBackground.blue
  );
}

/**
 * The budget, on one screen: every spending category with a target field,
 * its recent average as the hint, and a one-tap "use my averages" fill.
 * Over/under then shows automatically on the category bars and the month
 * header — this dialog is just where the plan gets written down.
 */
export function TargetsDialog({
  open,
  onOpenChange,
  categories,
  averages,
  incomeTotalGbp,
  onSaved,
}: TargetsDialogProps) {
  const spendingCategories = useMemo(
    () => categories.filter((c) => !c.excludeFromSpend),
    [categories],
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    for (const c of spendingCategories) {
      initial[c.id] = c.monthlyTarget !== null ? String(c.monthlyTarget) : "";
    }
    setDrafts(initial);
  }, [open, spendingCategories]);

  const parsed = (id: string): number | null => {
    const num = Number.parseFloat(drafts[id] ?? "");
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const plannedTotal = spendingCategories.reduce(
    (sum, c) => sum + (parsed(c.id) ?? 0),
    0,
  );

  const fillFromAverages = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const c of spendingCategories) {
        const avg = averages[c.id];
        if (!next[c.id] && avg && avg > 0) {
          // Round to a number a human would have picked.
          next[c.id] = String(Math.ceil(avg / 10) * 10);
        }
      }
      return next;
    });
  };

  const hasAverages = spendingCategories.some(
    (c) => (averages[c.id] ?? 0) > 0 && !drafts[c.id],
  );

  const handleSave = async () => {
    setIsSaving(true);
    const result = await saveCategoryTargets(
      spendingCategories.map((c) => ({
        id: c.id,
        monthlyTarget: parsed(c.id),
      })),
    );
    setIsSaving(false);

    if (result.success) {
      toast({
        title: "Targets saved",
        description:
          plannedTotal > 0
            ? `Planned ${formatCurrencyAmount(plannedTotal, "GBP")} a month.`
            : "All targets cleared.",
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set your targets</DialogTitle>
          <DialogDescription>
            A monthly number per category. Leave blank for no target — the
            bars show over/under automatically once a number is set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 py-1">
          {spendingCategories.map((c) => {
            const avg = averages[c.id];
            return (
              <div key={c.id} className="flex items-center gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <span
                    className={cn("size-2.5 shrink-0 rounded-full", swatch(c.color))}
                  />
                  <span className="truncate">{c.name}</span>
                  {c.isFixed && (
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                      fixed
                    </span>
                  )}
                </span>
                <div className="w-32 shrink-0">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={drafts[c.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="—"
                    className="h-9 text-right tabular-nums"
                    aria-label={`Monthly target for ${c.name}`}
                  />
                  <p className="mt-0.5 h-3.5 text-right text-[10px] text-muted-foreground">
                    {avg && avg > 0
                      ? `usually ${formatCurrencyAmount(avg, "GBP")}`
                      : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
          <span>
            Planned{" "}
            <span className="font-semibold tabular-nums">
              {formatCurrencyAmount(plannedTotal, "GBP")}
            </span>
            {incomeTotalGbp > 0 && plannedTotal > 0 && (
              <span className="text-xs text-muted-foreground">
                {" "}
                · {Math.round((plannedTotal / incomeTotalGbp) * 100)}% of income
              </span>
            )}
          </span>
          {hasAverages && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={fillFromAverages}
            >
              <Wand2 className="size-3.5" />
              Fill blanks from averages
            </Button>
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Save targets"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
