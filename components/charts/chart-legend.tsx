"use client";

import React from "react";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { formatAccountTypeName } from "./chart-shared";

export interface LegendItem {
  name: string;
  value: number;
  color: string;
}

interface ChartLegendProps {
  items: LegendItem[];
  chartCurrency: Currency;
  className?: string;
  formatLabel?: (name: string) => string;
}

// Compact series legend rendered under a chart title. Color swatch + label +
// value for each series, wraps to multiple rows if needed. Read-only.
export function ChartLegend({
  items,
  chartCurrency,
  className = "",
  formatLabel = formatAccountTypeName,
}: ChartLegendProps) {
  const { isMasked } = useMasking();

  if (items.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap gap-x-4 gap-y-1.5 items-center text-xs ${className}`}
    >
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5 min-w-0">
          <span
            className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground truncate">
            {formatLabel(item.name)}
          </span>
          <span className="font-medium tabular-nums">
            {isMasked
              ? "••••"
              : formatCurrencyAmount(item.value, chartCurrency, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                })}
          </span>
        </div>
      ))}
    </div>
  );
}
