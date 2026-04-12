"use client";

import React, { useMemo, useState } from "react";
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
import { formatCurrencyAmount, formatPercentage } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useWindowSize } from "@/hooks/use-window-size";

interface NetWorthChartProps {
  data: ChartData;
  chartCurrency: Currency;
  heightClass?: string;
}

type ViewType = "absolute" | "percentage";

export function NetWorthChart({
  data,
  chartCurrency,
  heightClass = "h-[280px] sm:h-[320px]",
}: NetWorthChartProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const [viewType, setViewType] = useState<ViewType>("absolute");
  const { hovered, pinPoint, setHovered, displayed } = useChartHover();
  const isPercentage = viewType === "percentage";
  const accountTypeKeys = useAccountTypeKeys(data.accountTypeData);

  // Compose the stacked area chart data — join netWorthData with the
  // per-account-type split, converting to percentage composition when asked.
  const chartPoints = useMemo(() => {
    return data.accountTypeData.map((point) => {
      const netWorth =
        data.netWorthData.find((nw) => nw.monthKey === point.monthKey)
          ?.netWorth ?? 0;
      const absNetWorth = Math.abs(netWorth);
      const result: Record<string, string | number> = {
        month: point.month,
        monthKey: point.monthKey,
        "Net Worth": netWorth,
      };
      accountTypeKeys.forEach((key) => {
        const balance = (point[key] as number) ?? 0;
        result[key] =
          isPercentage && absNetWorth > 0
            ? (balance / absNetWorth) * 100
            : balance;
      });
      return result;
    });
  }, [data.accountTypeData, data.netWorthData, accountTypeKeys, isPercentage]);

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

  // Legend items for the displayed point — sorted by hierarchy.
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
    return sortAccountTypesByHierarchy(items).map((i) => ({
      name: i.name,
      value: i.value,
      color: i.color,
    }));
  }, [displayedPoint, accountTypeKeys]);

  const margins = getResponsiveChartMargins(width);
  const fontSize = getResponsiveFontSize(width);

  const yDomain = useMemo(() => {
    const values: number[] = [];
    chartPoints.forEach((p) => {
      accountTypeKeys.forEach((key) => {
        const v = p[key];
        if (typeof v === "number" && !Number.isNaN(v)) values.push(v);
      });
    });
    if (values.length === 0) return [0, "auto"] as [number, number | "auto"];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.05;
    return [min < 0 ? min - padding : 0, max + padding] as [number, number];
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
      controls={
        <select
          value={viewType}
          onChange={(e) => setViewType(e.target.value as ViewType)}
          className="h-7 px-2 text-xs rounded border bg-background"
          aria-label="View type"
        >
          <option value="absolute">Absolute</option>
          <option value="percentage">% of Net Worth</option>
        </select>
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
                isPercentage
                  ? formatPercentage(v)
                  : isMasked
                  ? "•••"
                  : formatCurrencyAmount(v / 1000, chartCurrency) + "K"
              }
              fontSize={fontSize}
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
