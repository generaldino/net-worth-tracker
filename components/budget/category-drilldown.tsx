"use client";

import { useMemo } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { colorVariantsBackground } from "@/lib/color-variants";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { ExpenseRow } from "@/app/actions/expenses";
import type { CategoryRow } from "@/app/actions/expense-categories";

interface CategoryDrilldownProps {
  /** null = the uncategorised pseudo-category. */
  category: CategoryRow | null;
  monthLabel: string;
  /** This month's expenses in this category. */
  expenses: ExpenseRow[];
  /** Spend this month (GBP) from the totals row. */
  totalGbp: number;
  /** Average over the prior three months, GBP. */
  avgGbp: number | null;
  /** Six months of this category's spend, oldest → newest, GBP. */
  sparkline: number[] | null;
  /** Month keys matching the sparkline, oldest → newest. */
  sparklineMonths: string[];
  onEdit: (row: ExpenseRow) => void;
  onDelete: (row: ExpenseRow) => void;
  onClose: () => void;
}

function swatch(color: string | undefined) {
  if (!color) return "bg-muted-foreground/40";
  return (
    colorVariantsBackground[color as keyof typeof colorVariantsBackground] ??
    colorVariantsBackground.blue
  );
}

function sparkLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

interface MerchantGroup {
  key: string;
  label: string;
  rows: ExpenseRow[];
  /** Sum shown only when every row shares one currency. */
  uniformTotal: { amount: number; currency: ExpenseRow["currency"] } | null;
}

/**
 * A category, opened in place: its six-month shape, then its merchants
 * largest-first, then the individual transactions. This is where the old
 * always-on table went — detail on demand, in context.
 */
export function CategoryDrilldown({
  category,
  monthLabel,
  expenses,
  totalGbp,
  avgGbp,
  sparkline,
  sparklineMonths,
  onEdit,
  onDelete,
  onClose,
}: CategoryDrilldownProps) {
  const name = category?.name ?? "Uncategorised";
  const target = category?.monthlyTarget ?? null;
  const over = target !== null && totalGbp > target;

  const groups = useMemo<MerchantGroup[]>(() => {
    const map = new Map<string, MerchantGroup>();
    for (const row of expenses) {
      const label = (row.merchant || row.description || "Unknown").trim();
      const key = label.toLowerCase();
      const existing = map.get(key);
      if (existing) existing.rows.push(row);
      else map.set(key, { key, label, rows: [row], uniformTotal: null });
    }
    for (const group of map.values()) {
      group.rows.sort((a, b) => b.date.localeCompare(a.date));
      const currencies = new Set(group.rows.map((r) => r.currency));
      if (currencies.size === 1) {
        group.uniformTotal = {
          amount: group.rows.reduce((sum, r) => sum + r.amount, 0),
          currency: group.rows[0].currency,
        };
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const av = a.uniformTotal?.amount ?? 0;
      const bv = b.uniformTotal?.amount ?? 0;
      return Math.abs(bv) - Math.abs(av);
    });
  }, [expenses]);

  const sparkMax = sparkline ? Math.max(...sparkline, 1) : 1;

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <span
              className={cn("size-2.5 shrink-0 rounded-full", swatch(category?.color))}
            />
            {name}
            {over && (
              <Badge
                variant="secondary"
                className="h-4 bg-red-500/10 px-1.5 text-[10px] font-medium text-red-600 dark:text-red-400"
              >
                over
              </Badge>
            )}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular-nums">
              {formatCurrencyAmount(totalGbp, "GBP")}
            </span>{" "}
            in {monthLabel}
            {target !== null && (
              <> · target {formatCurrencyAmount(target, "GBP")}</>
            )}
            {avgGbp !== null && avgGbp > 0 && (
              <> · usually {formatCurrencyAmount(avgGbp, "GBP")}</>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onClose}
          aria-label={`Close ${name}`}
        >
          <X className="size-4" />
        </Button>
      </div>

      {sparkline && sparkline.some((v) => v > 0) && (
        <div className="mt-3">
          <div className="flex h-14 items-end gap-1.5">
            {sparkline.map((value, i) => (
              <div
                key={sparklineMonths[i] ?? i}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${sparkLabel(sparklineMonths[i] ?? "")}: ${formatCurrencyAmount(value, "GBP")}`}
              >
                <div
                  className={cn(
                    "w-full max-w-8 rounded-t",
                    i === sparkline.length - 1
                      ? swatch(category?.color)
                      : "bg-muted-foreground/30",
                  )}
                  style={{
                    height: `${Math.max((value / sparkMax) * 44, value > 0 ? 3 : 1)}px`,
                  }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {sparkLabel(sparklineMonths[i] ?? "")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No transactions this month.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="rounded-lg border">
              <div className="flex items-baseline justify-between gap-3 border-b bg-muted/40 px-3 py-1.5">
                <span className="min-w-0 truncate text-sm font-medium capitalize">
                  {group.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {group.rows.length}×
                  </span>
                </span>
                {group.uniformTotal && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCurrencyAmount(
                      group.uniformTotal.amount,
                      group.uniformTotal.currency,
                    )}
                  </span>
                )}
              </div>
              <div className="divide-y">
                {group.rows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    <span className="w-[4.5rem] shrink-0 text-xs text-muted-foreground">
                      {row.date.slice(5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-muted-foreground">
                      {row.description}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatCurrencyAmount(row.amount, row.currency)}
                    </span>
                    <span className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        title="Edit"
                        onClick={() => onEdit(row)}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive hover:text-destructive"
                        title="Delete"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
