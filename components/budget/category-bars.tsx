"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { colorVariantsBackground } from "@/lib/color-variants";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { CategoryRow } from "@/app/actions/expense-categories";

export interface CategoryTotalRow {
  categoryId: string | null;
  name: string;
  color: string;
  excludeFromSpend: boolean;
  total: number;
}

interface CategoryBarsProps {
  categories: CategoryRow[];
  totals: CategoryTotalRow[];
  /** Average GBP spend per category over the prior 3 months, keyed by id. */
  averages: Record<string, number>;
  activeFilter: string | null;
  onFilter: (categoryId: string | null) => void;
}

function swatch(color: string) {
  return (
    colorVariantsBackground[color as keyof typeof colorVariantsBackground] ??
    colorVariantsBackground.blue
  );
}

interface BarRow {
  id: string;
  name: string;
  color: string;
  spent: number;
  target: number | null;
  avg: number | null;
  isFixed: boolean;
}

/**
 * Plan vs actual, one bar per category. Variable categories first — they're
 * the ones you can act on this week — fixed costs below. A category appears
 * if it has spend this month or a target set.
 */
export function CategoryBars({
  categories,
  totals,
  averages,
  activeFilter,
  onFilter,
}: CategoryBarsProps) {
  const { variable, fixed, transfers } = useMemo(() => {
    const totalsById = new Map(
      totals.filter((t) => t.categoryId).map((t) => [t.categoryId as string, t]),
    );

    const rows: BarRow[] = categories
      .filter((c) => !c.excludeFromSpend)
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        spent: totalsById.get(c.id)?.total ?? 0,
        target: c.monthlyTarget,
        avg: averages[c.id] ?? null,
        isFixed: c.isFixed,
      }))
      .filter((r) => r.spent > 0 || r.target !== null)
      .sort((a, b) => b.spent - a.spent);

    return {
      variable: rows.filter((r) => !r.isFixed),
      fixed: rows.filter((r) => r.isFixed),
      transfers: totals.filter((t) => t.excludeFromSpend && t.categoryId),
    };
  }, [categories, totals, averages]);

  if (variable.length === 0 && fixed.length === 0 && transfers.length === 0) {
    return null;
  }

  const maxSpent = Math.max(
    ...variable.map((r) => Math.max(r.spent, r.target ?? 0)),
    ...fixed.map((r) => Math.max(r.spent, r.target ?? 0)),
    1,
  );

  const renderRow = (row: BarRow) => {
    const over = row.target !== null && row.spent > row.target;
    // With a target the bar is % of target; without, it's relative to the
    // biggest category so bars stay comparable.
    const denominator = row.target ?? maxSpent;
    const fillPct = Math.min((row.spent / Math.max(denominator, 1)) * 100, 100);
    const active = activeFilter === row.id;

    return (
      <button
        key={row.id}
        type="button"
        onClick={() => onFilter(active ? null : row.id)}
        className={cn(
          "w-full rounded-lg border px-3 py-2 text-left transition hover:bg-muted/40",
          active && "ring-2 ring-ring",
        )}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <span className={cn("size-2.5 shrink-0 rounded-full", swatch(row.color))} />
            <span className="truncate font-medium">{row.name}</span>
            {over && (
              <Badge
                variant="secondary"
                className="h-4 shrink-0 bg-red-500/10 px-1.5 text-[10px] font-medium text-red-600 dark:text-red-400"
              >
                over
              </Badge>
            )}
          </span>
          <span className="shrink-0 text-sm tabular-nums">
            <span className={cn("font-semibold", over && "text-red-600 dark:text-red-400")}>
              {formatCurrencyAmount(row.spent, "GBP")}
            </span>
            {row.target !== null && (
              <span className="text-muted-foreground">
                {" "}
                of {formatCurrencyAmount(row.target, "GBP")}
              </span>
            )}
          </span>
        </div>
        <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              over ? "bg-red-500" : swatch(row.color),
            )}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        {row.avg !== null && row.avg > 0 && (
          <p className="mt-1 text-[11px] text-muted-foreground">
            3-month average {formatCurrencyAmount(row.avg, "GBP")}
            {row.avg > 0 && row.spent > row.avg * 1.25 && row.spent > 0
              ? " — running high"
              : ""}
          </p>
        )}
      </button>
    );
  };

  return (
    <section className="space-y-4">
      {variable.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Variable — where you can act
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">{variable.map(renderRow)}</div>
        </div>
      )}
      {fixed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fixed
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">{fixed.map(renderRow)}</div>
        </div>
      )}
      {transfers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Not counted as spending:{" "}
          {transfers.map((t, i) => (
            <button
              key={t.categoryId}
              type="button"
              className={cn(
                "underline-offset-2 hover:underline",
                activeFilter === t.categoryId && "font-semibold text-foreground",
              )}
              onClick={() =>
                onFilter(activeFilter === t.categoryId ? null : t.categoryId)
              }
            >
              {t.name} {formatCurrencyAmount(t.total, "GBP")}
              {i < transfers.length - 1 ? ", " : ""}
            </button>
          ))}
        </p>
      )}
    </section>
  );
}
