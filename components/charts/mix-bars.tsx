"use client";

import { useMemo } from "react";
import type { ChartData } from "./types";
import { ChartCard } from "./chart-card";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import {
  getMixBucket,
  isLiquidType,
  type MixBucket,
} from "@/lib/account-helpers";
import { isAccountType } from "./chart-shared";
import type { AccountType } from "@/lib/types";

interface MixBarsProps {
  data: ChartData;
  chartCurrency: Currency;
}

const BUCKET_COLORS: Record<MixBucket, string> = {
  Cash: "hsl(142, 71%, 41%)",
  Invested: "hsl(217, 91%, 60%)",
  Property: "hsl(38, 92%, 50%)",
  Debt: "hsl(0, 84%, 60%)",
};

const BUCKET_HINTS: Record<MixBucket, string> = {
  Cash: "bank & savings",
  Invested: "markets & pensions",
  Property: "property & things",
  Debt: "cards & loans",
};

/**
 * The latest month grouped into four buckets — enough for an allocation
 * conversation without eleven typed ledgers. Liquid = what you could
 * realistically draw on (excludes pensions and property).
 */
export function MixBars({ data, chartCurrency }: MixBarsProps) {
  const { isMasked } = useMasking();

  const mix = useMemo(() => {
    const latest = data.accountTypeData[data.accountTypeData.length - 1];
    if (!latest) return null;

    const buckets: Record<MixBucket, number> = {
      Cash: 0,
      Invested: 0,
      Property: 0,
      Debt: 0,
    };
    let liquid = 0;

    for (const [key, raw] of Object.entries(latest)) {
      if (key === "month" || key === "monthKey" || key.endsWith("_currencies"))
        continue;
      const value = typeof raw === "number" ? raw : 0;
      if (!isAccountType(key)) continue;
      const type = key as AccountType;
      const bucket = getMixBucket(type);
      // Liability values arrive negative; store debt as positive owed.
      if (bucket === "Debt") buckets.Debt += Math.abs(value);
      else buckets[bucket] += value;
      if (isLiquidType(type) && value > 0) liquid += value;
    }

    const assetsTotal = buckets.Cash + buckets.Invested + buckets.Property;
    return { buckets, assetsTotal, liquid, month: latest.month };
  }, [data]);

  if (!mix || mix.assetsTotal <= 0) return null;

  const assetBuckets = (["Cash", "Invested", "Property"] as MixBucket[]).filter(
    (b) => mix.buckets[b] > 0,
  );
  const fmt = (v: number) =>
    isMasked ? "••••••" : formatCurrencyAmount(v, chartCurrency);
  const pct = (v: number) => Math.round((v / mix.assetsTotal) * 100);

  return (
    <ChartCard
      title="Your mix"
      subtitle={
        <span className="text-xs text-muted-foreground">{mix.month}</span>
      }
    >
      <div className="flex h-full flex-col justify-center gap-4 py-2">
        {/* Assets, one bar */}
        <div>
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            {assetBuckets.map((bucket) => (
              <div
                key={bucket}
                className="h-full"
                style={{
                  width: `${(mix.buckets[bucket] / mix.assetsTotal) * 100}%`,
                  backgroundColor: BUCKET_COLORS[bucket],
                }}
                title={`${bucket}: ${fmt(mix.buckets[bucket])}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {assetBuckets.map((bucket) => (
            <div
              key={bucket}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: BUCKET_COLORS[bucket] }}
                />
                {bucket}
                <span className="text-xs text-muted-foreground">
                  {BUCKET_HINTS[bucket]}
                </span>
              </span>
              <span className="font-medium tabular-nums">
                {fmt(mix.buckets[bucket])}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {pct(mix.buckets[bucket])}%
                </span>
              </span>
            </div>
          ))}

          {mix.buckets.Debt > 0 && (
            <div className="flex items-baseline justify-between gap-3 border-t pt-2 text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: BUCKET_COLORS.Debt }}
                />
                Debt
                <span className="text-xs text-muted-foreground">
                  {BUCKET_HINTS.Debt}
                </span>
              </span>
              <span className="font-medium tabular-nums text-red-600 dark:text-red-400">
                −{fmt(mix.buckets.Debt)}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Liquid — what you could draw on within weeks:{" "}
          <span className="font-medium text-foreground">{fmt(mix.liquid)}</span>{" "}
          (excludes pensions and property).
        </p>
      </div>
    </ChartCard>
  );
}
