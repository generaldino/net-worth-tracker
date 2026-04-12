"use client";

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartData } from "./types";
import { ChartCard } from "./chart-card";
import { ChartLegend, type LegendItem } from "./chart-legend";
import {
  formatAccountTypeName,
  getAccountTypeColor,
  getResponsiveChartMargins,
  getResponsiveFontSize,
  sortAccountTypesByHierarchy,
  useAccountTypeKeys,
  useChartHover,
} from "./chart-shared";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useWindowSize } from "@/hooks/use-window-size";

interface NetWorthChartProps {
  data: ChartData;
  chartCurrency: Currency;
  heightClass?: string;
}

export function NetWorthChart({
  data,
  chartCurrency,
  heightClass = "h-[280px] sm:h-[320px]",
}: NetWorthChartProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const { hovered, pinPoint, setHovered, displayed } = useChartHover();
  const accountTypeKeys = useAccountTypeKeys(data.accountTypeData);

  const chartPoints = useMemo(() => {
    return data.accountTypeData.map((point) => {
      const netWorth =
        data.netWorthData.find((nw) => nw.monthKey === point.monthKey)
          ?.netWorth ?? 0;
      const result: Record<string, string | number> = {
        month: point.month,
        monthKey: point.monthKey,
        "Net Worth": netWorth,
      };
      accountTypeKeys.forEach((key) => {
        result[key] = (point[key] as number) ?? 0;
      });
      return result;
    });
  }, [data.accountTypeData, data.netWorthData, accountTypeKeys]);

  const latest = chartPoints[chartPoints.length - 1];
  const latestNetWorth = (latest?.["Net Worth"] as number) ?? 0;

  // Pick the point to show in the header: pinned or hovered beats latest.
  const displayedPoint =
    (displayed &&
      chartPoints.find((p) => p.month === displayed.month)) ||
    latest;
  const displayedNetWorth =
    ((displayedPoint?.["Net Worth"] as number) ?? 0) || latestNetWorth;
  const displayedMonth = (displayedPoint?.month as string) ?? "";

  // Legend items ordered to match the visual stack: assets top-down (matching
  // bar heights from top of stack), then liabilities below the zero line.
  const legendItems: LegendItem[] = useMemo(() => {
    if (!displayedPoint) return [];
    const items = accountTypeKeys
      .map((key) => ({
        name: key,
        value: (displayedPoint[key] as number) ?? 0,
        absValue: Math.abs((displayedPoint[key] as number) ?? 0),
        color: getAccountTypeColor(key),
      }))
      .filter((i) => i.absValue > 0);
    const sorted = sortAccountTypesByHierarchy(items);
    const positives = sorted.filter((i) => i.value >= 0).reverse();
    const negatives = sorted.filter((i) => i.value < 0);
    return [...positives, ...negatives].map((i) => ({
      name: i.name,
      value: i.value,
      color: i.color,
    }));
  }, [displayedPoint, accountTypeKeys]);

  const margins = getResponsiveChartMargins(width);
  const fontSize = getResponsiveFontSize(width);

  // Use stacked-sign totals (not individual values) so the bar never clips.
  // Positives stack up from 0, negatives (liabilities) stack down from 0.
  const yDomain = useMemo(() => {
    if (chartPoints.length === 0) return [0, "auto"] as [number, number | "auto"];
    let posMax = 0;
    let negMin = 0;
    chartPoints.forEach((p) => {
      let pos = 0;
      let neg = 0;
      accountTypeKeys.forEach((key) => {
        const v = p[key];
        if (typeof v !== "number" || Number.isNaN(v)) return;
        if (v >= 0) pos += v;
        else neg += v;
      });
      if (pos > posMax) posMax = pos;
      if (neg < negMin) negMin = neg;
    });
    const range = posMax - negMin || posMax || 1;
    const padding = range * 0.05;
    return [negMin < 0 ? negMin - padding : 0, posMax + padding] as [
      number,
      number
    ];
  }, [chartPoints, accountTypeKeys]);

  return (
    <ChartCard
      title="Net Worth"
      subtitle={
        <div>
          <div
            className={`text-2xl sm:text-3xl font-bold ${
              displayedNetWorth >= 0 ? "text-foreground" : "text-red-600"
            }`}
          >
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(displayedNetWorth, chartCurrency)}
          </div>
          {displayedMonth && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {displayedMonth}
            </div>
          )}
          <ChartLegend
            items={legendItems}
            chartCurrency={chartCurrency}
            className="mt-3"
            formatLabel={formatAccountTypeName}
          />
        </div>
      }
    >
      <div className={`w-full ${heightClass}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartPoints}
            margin={margins}
            onMouseMove={(e) => {
              const month = e?.activePayload?.[0]?.payload?.month as
                | string
                | undefined;
              if (month) {
                setHovered((prev) =>
                  prev?.month === month ? prev : { month }
                );
              }
            }}
            onMouseLeave={() => setHovered(null)}
            onClick={(e) => {
              const month = e?.activePayload?.[0]?.payload?.month as
                | string
                | undefined;
              if (month) pinPoint({ month });
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="month" hide />
            <YAxis
              hide
              domain={yDomain}
              tickFormatter={(v) =>
                isMasked
                  ? "•••"
                  : formatCurrencyAmount(v / 1000, chartCurrency) + "K"
              }
              fontSize={fontSize}
            />
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeOpacity={0.6}
            />
            <Tooltip
              content={() => null}
              cursor={{
                stroke: "hsl(var(--foreground))",
                strokeWidth: 1,
                strokeDasharray: "5 5",
              }}
              isAnimationActive={false}
            />
            {hovered && (
              <ReferenceLine
                x={hovered.month}
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            )}
            {accountTypeKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="net-worth"
                fill={getAccountTypeColor(key)}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
