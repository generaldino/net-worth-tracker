"use client";

import React, { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
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
  getResponsiveChartMargins,
  getResponsiveFontSize,
  getSeriesColor,
  getSeriesLabel,
  useChartHover,
} from "./chart-shared";
import {
  BarSegmentTooltipOverlay,
  useBarSegmentTooltip,
} from "./bar-segment-tooltip";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useWindowSize } from "@/hooks/use-window-size";

const SOURCE_KEYS = [
  "Savings from Income",
  "Interest Earned",
  "Capital Gains",
] as const;

type SourceKey = (typeof SOURCE_KEYS)[number];

type ViewType = "cumulative" | "monthly";

interface NetWorthChangesChartProps {
  data: ChartData;
  chartCurrency: Currency;
  viewType?: ViewType;
  title?: string;
  heightClass?: string;
}

export function NetWorthChangesChart({
  data,
  chartCurrency,
  viewType = "monthly",
  title = "Net Worth Changes",
  heightClass = "h-[240px] sm:h-[280px]",
}: NetWorthChangesChartProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const { hovered, pinPoint, setHovered, displayed } = useChartHover();
  const segmentTooltip = useBarSegmentTooltip();

  // Sort chronologically and accumulate if cumulative view is on.
  const chartPoints = useMemo(() => {
    const sorted = [...data.sourceData].sort((a, b) => {
      return new Date(a.month).getTime() - new Date(b.month).getTime();
    });
    if (viewType === "monthly") return sorted;

    const running: Record<SourceKey, number> = {
      "Savings from Income": 0,
      "Interest Earned": 0,
      "Capital Gains": 0,
    };
    return sorted.map((point) => {
      const next = { ...point };
      SOURCE_KEYS.forEach((key) => {
        running[key] += (point[key] as number) || 0;
        next[key] = running[key];
      });
      return next;
    });
  }, [data.sourceData, viewType]);

  const latest = chartPoints[chartPoints.length - 1];
  const displayedPoint =
    (displayed && chartPoints.find((p) => p.month === displayed.month)) ||
    latest;

  const displayedValues = useMemo(() => {
    if (!displayedPoint)
      return { savings: 0, interest: 0, gains: 0, total: 0 };
    const savings = (displayedPoint["Savings from Income"] as number) || 0;
    const interest = (displayedPoint["Interest Earned"] as number) || 0;
    const gains = (displayedPoint["Capital Gains"] as number) || 0;
    return { savings, interest, gains, total: savings + interest + gains };
  }, [displayedPoint]);

  // Ordered top-of-stack first so the legend reads the same direction as the
  // visual: Capital Gains sits on top, Savings from Income sits on the bottom.
  const legendItems: LegendItem[] = useMemo(
    () => [
      {
        name: "Capital Gains",
        value: displayedValues.gains,
        color: getSeriesColor("Capital Gains"),
      },
      {
        name: "Interest Earned",
        value: displayedValues.interest,
        color: getSeriesColor("Interest Earned"),
      },
      {
        name: "Savings from Income",
        value: displayedValues.savings,
        color: getSeriesColor("Savings from Income"),
      },
    ],
    [displayedValues]
  );

  const margins = getResponsiveChartMargins(width);
  const fontSize = getResponsiveFontSize(width);

  return (
    <ChartCard
      title={title}
      subtitle={
        <div>
          <div
            className={`text-xl sm:text-2xl font-bold ${
              displayedValues.total >= 0
                ? "text-foreground"
                : "text-red-600"
            }`}
          >
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(displayedValues.total, chartCurrency)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {(displayedPoint?.month as string) ?? ""}
          </div>
          <ChartLegend
            items={legendItems}
            chartCurrency={chartCurrency}
            className="mt-3"
            formatLabel={getSeriesLabel}
          />
        </div>
      }
    >
      <div
        ref={segmentTooltip.containerRef}
        className={`relative w-full ${heightClass}`}
        onMouseMove={segmentTooltip.handleMouseMove}
        onMouseLeave={segmentTooltip.handleMouseLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
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
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border/40"
            />
            <XAxis dataKey="month" hide />
            <YAxis
              hide
              domain={["auto", "auto"]}
              fontSize={fontSize}
              allowDataOverflow
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
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
            {SOURCE_KEYS.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="changes"
                fill={getSeriesColor(key)}
                isAnimationActive={false}
                {...segmentTooltip.makeBarProps(key, getSeriesColor(key))}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <BarSegmentTooltipOverlay
          segment={segmentTooltip.segment}
          pos={segmentTooltip.pos}
          chartCurrency={chartCurrency}
          formatLabel={getSeriesLabel}
          showSign
        />
      </div>
    </ChartCard>
  );
}
