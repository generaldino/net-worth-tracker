"use client";

import React, { useMemo, useRef, useState } from "react";
import type { ChartData } from "./types";
import { ChartCard } from "./chart-card";
import {
  formatAccountTypeName,
  getAccountTypeColor,
  sortAccountTypesByHierarchy,
} from "./chart-shared";
import { BarSegmentTooltipOverlay } from "./bar-segment-tooltip";
import { formatCurrencyAmount, formatPercentage } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";

interface AssetAllocationChartProps {
  data: ChartData;
  chartCurrency: Currency;
  heightClass?: string;
}

// Horizontal stacked bar with inline labels. Reads better than a half-width
// pie chart, especially with 6+ account types.
export function AssetAllocationChart({
  data,
  chartCurrency,
  heightClass = "h-[240px] sm:h-[280px]",
}: AssetAllocationChartProps) {
  const { isMasked } = useMasking();

  const availableMonths = useMemo(
    () => data.accountTypeData.map((d) => d.month).slice().reverse(),
    [data.accountTypeData]
  );
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(
    undefined
  );

  const monthData = useMemo(() => {
    const source = data.accountTypeData;
    if (source.length === 0) return null;
    if (selectedMonth) {
      const found = source.find((d) => d.month === selectedMonth);
      if (found) return found;
    }
    return source[source.length - 1];
  }, [data.accountTypeData, selectedMonth]);

  const segments = useMemo(() => {
    if (!monthData) return [];
    const items = Object.entries(monthData)
      .filter(
        ([key, value]) =>
          key !== "month" &&
          key !== "monthKey" &&
          key !== "Credit_Card" &&
          key !== "Loan" &&
          !key.endsWith("_currencies") &&
          typeof value === "number" &&
          (value as number) > 0
      )
      .map(([name, value]) => ({
        name,
        value: value as number,
        absValue: value as number,
        color: getAccountTypeColor(name),
      }));
    return sortAccountTypesByHierarchy(items);
  }, [monthData]);

  const totalAssets = useMemo(
    () => segments.reduce((sum, s) => sum + s.value, 0),
    [segments]
  );

  const barRef = useRef<HTMLDivElement | null>(null);
  const [hoverSegment, setHoverSegment] = useState<{
    name: string;
    value: number;
    color: string;
  } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const handleBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleBarMouseLeave = () => {
    setHoverSegment(null);
    setHoverPos(null);
  };

  return (
    <ChartCard
      title="Asset Allocation"
      subtitle={
        <div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(totalAssets, chartCurrency)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {monthData?.month ?? ""}
          </div>
        </div>
      }
      controls={
        availableMonths.length > 1 && (
          <select
            value={selectedMonth ?? ""}
            onChange={(e) => setSelectedMonth(e.target.value || undefined)}
            className="h-7 px-2 text-xs rounded border bg-background max-w-[110px]"
            aria-label="Month"
          >
            <option value="">Latest</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )
      }
    >
      <div className={`w-full flex flex-col justify-center ${heightClass}`}>
        {segments.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center">
            No asset data
          </div>
        ) : (
          <div className="w-full space-y-3">
            {/* Horizontal stacked bar */}
            <div
              ref={barRef}
              className="relative w-full"
              onMouseMove={handleBarMouseMove}
              onMouseLeave={handleBarMouseLeave}
            >
              <div className="w-full h-8 rounded-md overflow-hidden flex">
                {segments.map((seg) => {
                  const percent =
                    totalAssets > 0 ? (seg.value / totalAssets) * 100 : 0;
                  return (
                    <div
                      key={seg.name}
                      className="h-full flex items-center justify-center text-[10px] font-semibold text-white overflow-hidden cursor-default"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: seg.color,
                      }}
                      onMouseEnter={() =>
                        setHoverSegment({
                          name: seg.name,
                          value: seg.value,
                          color: seg.color,
                        })
                      }
                    >
                      {percent >= 8 ? formatPercentage(percent) : ""}
                    </div>
                  );
                })}
              </div>
              <BarSegmentTooltipOverlay
                segment={hoverSegment}
                pos={hoverPos}
                chartCurrency={chartCurrency}
                formatLabel={formatAccountTypeName}
              />
            </div>

            {/* Per-segment rows with absolute values */}
            <div className="space-y-1.5">
              {segments.map((seg) => {
                const percent =
                  totalAssets > 0 ? (seg.value / totalAssets) * 100 : 0;
                return (
                  <div
                    key={seg.name}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-muted-foreground truncate">
                        {formatAccountTypeName(seg.name)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 tabular-nums">
                      <span className="font-medium">
                        {isMasked
                          ? "••••"
                          : formatCurrencyAmount(seg.value, chartCurrency, {
                              notation: "compact",
                              maximumFractionDigits: 1,
                            })}
                      </span>
                      <span className="text-muted-foreground w-10 text-right">
                        {formatPercentage(percent)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
