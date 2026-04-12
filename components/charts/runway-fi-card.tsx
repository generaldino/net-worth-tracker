"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useChartData } from "@/contexts/chart-data-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useChartCurrencyConverter } from "@/lib/chart-currency-converter";
import { useMasking } from "@/contexts/masking-context";
import type { Currency } from "@/lib/fx-rates";
import { formatCurrencyAmount } from "@/lib/fx-rates";

// Liquid = account types that could be sold or spent in weeks, not years.
// Excludes Pension, Stock_options (vesting), and Asset (house/car).
const LIQUID_TYPES = new Set([
  "Current",
  "Savings",
  "Investment",
  "Stock",
  "Crypto",
  "Commodity",
]);

// Trailing window used for "typical monthly spend". 12 is the convention —
// smooths lumpy months (holidays, annual bills) and matches how personal
// finance tools compute FI numbers.
const SPEND_WINDOW_MONTHS = 12;

// Safe Withdrawal Rate — Trinity study 4% rule → FI target = 25× annual spend.
const FI_MULTIPLIER = 25;

function formatMonths(months: number, isMasked: boolean): string {
  if (isMasked) return "••";
  if (!Number.isFinite(months)) return "∞";
  if (months >= 12) {
    const years = months / 12;
    return `${years.toFixed(1)} yrs`;
  }
  return `${months.toFixed(1)} mo`;
}

export function RunwayFICard() {
  const rawData = useChartData();
  const { getChartCurrency } = useDisplayCurrency();
  const { convertChartData } = useChartCurrencyConverter();
  const { isMasked } = useMasking();

  const currency = getChartCurrency();
  const chartCurrency = (
    currency === "BASE" ? "GBP" : currency
  ) as Currency;

  const metrics = useMemo(() => {
    if (!rawData) return null;
    const data = convertChartData(rawData, chartCurrency);

    const latest = data.netWorthData[data.netWorthData.length - 1];
    if (!latest) return null;

    const netWorth = latest.netWorth;

    // Liquid assets — latest snapshot, respecting isLiability flag.
    const accountById = new Map(data.accounts.map((a) => [a.id, a]));
    let liquid = 0;
    for (const bal of latest.accountBalances ?? []) {
      if (bal.isLiability) {
        liquid -= bal.balance;
        continue;
      }
      const account = accountById.get(bal.accountId);
      if (account && LIQUID_TYPES.has(account.type)) {
        liquid += bal.balance;
      }
    }

    // Trailing 12-month average spend.
    const recent = data.sourceData.slice(-SPEND_WINDOW_MONTHS);
    const spendSum = recent.reduce(
      (sum, s) => sum + Math.abs((s["Total Expenditure"] as number) || 0),
      0
    );
    const monthlySpend = recent.length > 0 ? spendSum / recent.length : 0;
    const annualSpend = monthlySpend * 12;
    const fiTarget = annualSpend * FI_MULTIPLIER;

    const runwayMonths = monthlySpend > 0 ? liquid / monthlySpend : null;
    const fiProgress = fiTarget > 0 ? (netWorth / fiTarget) * 100 : null;

    return {
      liquid,
      monthlySpend,
      annualSpend,
      fiTarget,
      netWorth,
      runwayMonths,
      fiProgress,
    };
  }, [rawData, chartCurrency, convertChartData]);

  if (!metrics) return null;

  const {
    liquid,
    monthlySpend,
    fiTarget,
    netWorth,
    runwayMonths,
    fiProgress,
  } = metrics;

  const progressClamped =
    fiProgress === null ? 0 : Math.max(0, Math.min(100, fiProgress));

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Runway */}
        <div className="flex flex-col gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Runway
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tabular-nums">
              {runwayMonths === null
                ? "—"
                : formatMonths(runwayMonths, isMasked)}
            </span>
            <span className="text-xs text-muted-foreground">
              at current spend
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            How long your liquid assets (
            {isMasked ? "••••" : formatCurrencyAmount(liquid, chartCurrency)})
            would cover your average monthly spend (
            {isMasked
              ? "••••"
              : formatCurrencyAmount(monthlySpend, chartCurrency)}
            ) — based on the trailing {SPEND_WINDOW_MONTHS} months.
          </p>
        </div>

        {/* FI Progress */}
        <div className="flex flex-col gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Financial Independence
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold tabular-nums">
              {fiProgress === null
                ? "—"
                : isMasked
                ? "••"
                : `${fiProgress.toFixed(1)}%`}
            </span>
            <span className="text-xs text-muted-foreground">of FI target</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progressClamped}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            FI target is 25× annual spend ={" "}
            {isMasked ? "••••" : formatCurrencyAmount(fiTarget, chartCurrency)}.
            Current net worth:{" "}
            {isMasked ? "••••" : formatCurrencyAmount(netWorth, chartCurrency)}.
          </p>
        </div>
      </div>
    </Card>
  );
}
