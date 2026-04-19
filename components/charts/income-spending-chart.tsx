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

interface IncomeSpendingChartProps {
  data: ChartData;
  chartCurrency: Currency;
  heightClass?: string;
}

export function IncomeSpendingChart({
  data,
  chartCurrency,
  heightClass = "h-[260px] sm:h-[300px]",
}: IncomeSpendingChartProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const { hovered, pinPoint, setHovered, displayed } = useChartHover();
  const segmentTooltip = useBarSegmentTooltip();

  const chartPoints = useMemo(() => {
    return data.sourceData
      .filter((item) => item && item.month && item.monthKey)
      .map((item) => ({
        month: item.month,
        monthKey: item.monthKey,
        "Total Income":
          typeof item["Total Income"] === "number" ? item["Total Income"] : 0,
        "Total Expenditure":
          typeof item["Total Expenditure"] === "number"
            ? -Math.abs(item["Total Expenditure"] as number)
            : 0,
        "Savings from Income":
          typeof item["Savings from Income"] === "number"
            ? item["Savings from Income"]
            : 0,
        "Savings Rate":
          typeof item["Savings Rate"] === "number" ? item["Savings Rate"] : 0,
      }));
  }, [data.sourceData]);

  const latest = chartPoints[chartPoints.length - 1];
  const displayedPoint =
    (displayed && chartPoints.find((p) => p.month === displayed.month)) ||
    latest;

  const savingsRate = (displayedPoint?.["Savings Rate"] as number) ?? 0;
  const income = (displayedPoint?.["Total Income"] as number) ?? 0;
  const expenditure = Math.abs(
    (displayedPoint?.["Total Expenditure"] as number) ?? 0
  );

  const margins = getResponsiveChartMargins(width);
  const fontSize = getResponsiveFontSize(width);

  if (chartPoints.length === 0) {
    return (
      <ChartCard title="Income & Spending">
        <div className={`w-full flex items-center justify-center text-center text-sm text-muted-foreground ${heightClass}`}>
          Add income and expenditure data to see your savings rate.
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Income & Spending"
      subtitle={
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-2xl sm:text-3xl font-bold ${
                savingsRate >= 0 ? "text-foreground" : "text-red-600"
              }`}
            >
              {`${savingsRate >= 0 ? "+" : ""}${Math.round(savingsRate)}%`}
            </span>
            <span className="text-xs text-muted-foreground">savings rate</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {(displayedPoint?.month as string) ?? ""}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: getSeriesColor("Total Income") }}
              />
              <span className="text-muted-foreground">
                {getSeriesLabel("Total Income")}
              </span>
              <span className="font-medium tabular-nums">
                {isMasked
                  ? "••••"
                  : formatCurrencyAmount(income, chartCurrency, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: getSeriesColor("Total Expenditure") }}
              />
              <span className="text-muted-foreground">
                {getSeriesLabel("Total Expenditure")}
              </span>
              <span className="font-medium tabular-nums">
                {isMasked
                  ? "••••"
                  : formatCurrencyAmount(expenditure, chartCurrency, {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm"
                style={{
                  backgroundColor: getSeriesColor("Savings from Income"),
                }}
              />
              <span className="text-muted-foreground">
                {getSeriesLabel("Savings from Income")}
              </span>
              <span className="font-medium tabular-nums">
                {isMasked
                  ? "••••"
                  : formatCurrencyAmount(
                      income - expenditure,
                      chartCurrency,
                      { notation: "compact", maximumFractionDigits: 1 }
                    )}
              </span>
            </div>
          </div>
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
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="month" hide />
            <YAxis
              yAxisId="left"
              hide
              tickFormatter={(v) =>
                isMasked
                  ? "•••"
                  : formatCurrencyAmount(v / 1000, chartCurrency) + "K"
              }
              fontSize={fontSize}
              domain={["auto", "auto"]}
              allowDataOverflow
            />
            <ReferenceLine y={0} yAxisId="left" stroke="hsl(var(--muted-foreground))" />
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
                yAxisId="left"
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            )}
            <Bar
              yAxisId="left"
              dataKey="Total Income"
              fill={getSeriesColor("Total Income")}
              isAnimationActive={false}
              {...segmentTooltip.makeBarProps(
                "Total Income",
                getSeriesColor("Total Income")
              )}
            />
            <Bar
              yAxisId="left"
              dataKey="Total Expenditure"
              fill={getSeriesColor("Total Expenditure")}
              isAnimationActive={false}
              {...segmentTooltip.makeBarProps(
                "Total Expenditure",
                getSeriesColor("Total Expenditure")
              )}
            />
            <Bar
              yAxisId="left"
              dataKey="Savings from Income"
              fill={getSeriesColor("Savings from Income")}
              isAnimationActive={false}
              {...segmentTooltip.makeBarProps(
                "Savings from Income",
                getSeriesColor("Savings from Income")
              )}
            />
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
