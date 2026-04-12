"use client";

import React from "react";
import type { TooltipProps } from "recharts";
import {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { formatAccountTypeName } from "./chart-shared";

interface ChartTooltipProps extends TooltipProps<ValueType, NameType> {
  chartCurrency: Currency;
  formatLabel?: (name: string) => string;
  showTotal?: boolean;
  /** Render expenditure as positive (bars are stored negative to draw down). */
  absoluteValues?: boolean;
  /** Hide series whose value is zero at the hovered point. */
  hideZero?: boolean;
}

// Shared custom tooltip for Recharts charts. Renders a compact card with the
// hovered month, one swatch+label+value row per series, and an optional total.
export function ChartTooltip({
  active,
  payload,
  label,
  chartCurrency,
  formatLabel = formatAccountTypeName,
  showTotal = false,
  absoluteValues = false,
  hideZero = true,
}: ChartTooltipProps) {
  const { isMasked } = useMasking();

  if (!active || !payload || payload.length === 0) return null;

  const rows = payload
    .map((p) => {
      const raw = typeof p.value === "number" ? p.value : 0;
      const displayValue = absoluteValues ? Math.abs(raw) : raw;
      return {
        key: String(p.dataKey ?? p.name ?? ""),
        name: String(p.name ?? p.dataKey ?? ""),
        value: displayValue,
        signedValue: raw,
        color: (p.color as string) || (p.fill as string) || "#999",
      };
    })
    .filter((r) => (hideZero ? r.value !== 0 : true));

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, r) => sum + r.signedValue, 0);

  return (
    <div className="rounded-md border border-border/60 bg-background/95 shadow-md backdrop-blur-sm px-2.5 py-2 text-xs min-w-[160px] pointer-events-none">
      {label && (
        <div className="text-muted-foreground mb-1.5 font-medium">
          {String(label)}
        </div>
      )}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: r.color }}
            />
            <span className="text-muted-foreground truncate flex-1 min-w-0">
              {formatLabel(r.name)}
            </span>
            <span className="font-medium tabular-nums ml-2">
              {isMasked
                ? "••••"
                : formatCurrencyAmount(r.value, chartCurrency, {
                    notation: "compact",
                    maximumFractionDigits: 1,
                  })}
            </span>
          </div>
        ))}
      </div>
      {showTotal && rows.length > 1 && (
        <div className="mt-1.5 pt-1.5 border-t border-border/60 flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Total</span>
          <span
            className={`font-semibold tabular-nums ${
              total < 0 ? "text-red-600" : ""
            }`}
          >
            {isMasked
              ? "••••"
              : formatCurrencyAmount(total, chartCurrency, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                })}
          </span>
        </div>
      )}
    </div>
  );
}
