"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import type { ChartData } from "./types";
import { ChartCard } from "./chart-card";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { cn } from "@/lib/utils";

interface WhyItChangedProps {
  data: ChartData;
  chartCurrency: Currency;
  periodLabel: string;
  /** True when accounts/types are hidden by the visibility filter. */
  isFiltered?: boolean;
}

/**
 * The adviser's decomposition: over the visible period, how much of the net
 * worth move was money you saved, and how much was markets doing their thing.
 *
 *   net change = (income − spending) + growth residual
 *
 * All three inputs already exist in the chart data — no ledger required.
 */
export function WhyItChanged({
  data,
  chartCurrency,
  periodLabel,
  isFiltered = false,
}: WhyItChangedProps) {
  const { isMasked } = useMasking();

  const stats = useMemo(() => {
    const points = data.netWorthData;
    if (points.length === 0) return null;

    const first = points[0].netWorth;
    const last = points[points.length - 1].netWorth;
    const netChange = last - first;

    let income = 0;
    let spend = 0;
    for (const m of data.sourceData) {
      income += (m["Total Income"] as number) || 0;
      spend += Math.abs((m["Total Expenditure"] as number) || 0);
    }
    const saved = income - spend;
    const growth = netChange - saved;
    const savingsRate = income > 0 ? (saved / income) * 100 : null;

    // If the window starts before income/spending were tracked, the split
    // only covers the tracked era — say so instead of implying full coverage.
    const firstTrackedIdx = data.sourceData.findIndex(
      (m) =>
        ((m["Total Expenditure"] as number) || 0) !== 0 ||
        ((m["Total Income"] as number) || 0) !== 0,
    );
    const trackedSince =
      firstTrackedIdx > 0 ? data.sourceData[firstTrackedIdx].month : null;

    return { netChange, saved, growth, income, spend, savingsRate, trackedSince };
  }, [data]);

  if (!stats) return null;

  const mask = (v: number) =>
    isMasked ? "••••••" : formatCurrencyAmount(v, chartCurrency);

  const rows = [
    {
      label: "You saved",
      hint: `income ${mask(stats.income)} − spending ${mask(stats.spend)}`,
      value: stats.saved,
    },
    {
      label: "Markets & growth",
      hint: "value changes not explained by saving",
      value: stats.growth,
    },
  ];

  return (
    <ChartCard
      title="Why it changed"
      subtitle={
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      }
    >
      <div className="flex h-full flex-col justify-center gap-3 py-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3"
          >
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.hint}</p>
            </div>
            <p
              className={cn(
                "text-base font-semibold tabular-nums sm:text-lg",
                row.value >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {row.value >= 0 ? "+" : "−"}
              {isMasked
                ? "••••••"
                : formatCurrencyAmount(Math.abs(row.value), chartCurrency)}
            </p>
          </div>
        ))}

        <div className="flex items-baseline justify-between gap-3 border-t pt-3">
          <p className="text-sm font-semibold">Net worth change</p>
          <p
            className={cn(
              "text-base font-bold tabular-nums sm:text-lg",
              stats.netChange >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {stats.netChange >= 0 ? "+" : "−"}
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(Math.abs(stats.netChange), chartCurrency)}
          </p>
        </div>

        {stats.savingsRate !== null && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" />
            You kept {isMasked ? "••" : Math.round(stats.savingsRate)}% of what
            you earned — that&apos;s the part you control.
          </p>
        )}

        {stats.trackedSince && (
          <p className="text-[11px] text-muted-foreground">
            Income &amp; spending are tracked from {stats.trackedSince} — the
            saved-vs-growth split covers that era; earlier net worth change
            shows under markets &amp; growth.
          </p>
        )}

        {isFiltered && (
          <p className="text-[11px] text-muted-foreground">
            Some accounts are hidden: the net worth change excludes them, while
            income and spending still cover everything — so their growth moves
            out of the &quot;markets &amp; growth&quot; line.
          </p>
        )}
      </div>
    </ChartCard>
  );
}
