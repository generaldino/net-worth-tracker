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
  // When true, items are split into "Assets" (value >= 0) and "Liabilities"
  // (value < 0) sections, each with a small heading. Negative values render
  // with a leading "−" so liabilities read clearly as negative.
  splitByValue?: boolean;
}

// Compact series legend rendered under a chart title. Color swatch + label +
// value for each series, wraps to multiple rows if needed. Read-only.
export function ChartLegend({
  items,
  chartCurrency,
  className = "",
  formatLabel = formatAccountTypeName,
  splitByValue = false,
}: ChartLegendProps) {
  const { isMasked } = useMasking();

  if (items.length === 0) return null;

  if (splitByValue) {
    const assets = items.filter((i) => i.value >= 0);
    const liabilities = items.filter((i) => i.value < 0);
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {assets.length > 0 && (
          <LegendGroup
            title="Assets"
            items={assets}
            chartCurrency={chartCurrency}
            formatLabel={formatLabel}
            isMasked={isMasked}
          />
        )}
        {liabilities.length > 0 && (
          <LegendGroup
            title="Liabilities"
            items={liabilities}
            chartCurrency={chartCurrency}
            formatLabel={formatLabel}
            isMasked={isMasked}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap gap-x-4 gap-y-1.5 items-center text-xs ${className}`}
    >
      {items.map((item) => (
        <LegendRow
          key={item.name}
          item={item}
          chartCurrency={chartCurrency}
          formatLabel={formatLabel}
          isMasked={isMasked}
        />
      ))}
    </div>
  );
}

interface LegendGroupProps {
  title: string;
  items: LegendItem[];
  chartCurrency: Currency;
  formatLabel: (name: string) => string;
  isMasked: boolean;
}

function LegendGroup({
  title,
  items,
  chartCurrency,
  formatLabel,
  isMasked,
}: LegendGroupProps) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {title}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 items-center text-xs">
        {items.map((item) => (
          <LegendRow
            key={item.name}
            item={item}
            chartCurrency={chartCurrency}
            formatLabel={formatLabel}
            isMasked={isMasked}
          />
        ))}
      </div>
    </div>
  );
}

interface LegendRowProps {
  item: LegendItem;
  chartCurrency: Currency;
  formatLabel: (name: string) => string;
  isMasked: boolean;
}

function LegendRow({
  item,
  chartCurrency,
  formatLabel,
  isMasked,
}: LegendRowProps) {
  const isNegative = item.value < 0;
  const formatted = formatCurrencyAmount(Math.abs(item.value), chartCurrency, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const display = isMasked
    ? "••••"
    : isNegative
    ? `−${formatted}`
    : formatted;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span
        className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-muted-foreground truncate">
        {formatLabel(item.name)}
      </span>
      <span className="font-medium tabular-nums">{display}</span>
    </div>
  );
}
