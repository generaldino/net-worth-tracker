"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useWindowSize } from "@/hooks/use-window-size";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Area,
  AreaChart,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Legend,
  Tooltip,
} from "recharts";
import { ChartType, ChartData, ClickedData } from "@/components/charts/types";
import { DataDetailsPanel } from "@/components/charts/data-details-panel";
import {
  ChartHeader,
  type HoveredData,
} from "@/components/charts/chart-header";
import { PeriodSelector } from "./period-selector";
import { COLORS } from "./constants";
import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useProjection } from "@/contexts/projection-context";
import type { TimePeriod } from "@/lib/types";

interface PieTooltipPayload {
  name: string;
  value: number;
  fill: string;
}

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

interface ChartDisplayProps {
  chartType: ChartType;
  chartData: ChartData;
  clickedData: ClickedData | null;
  setClickedData: (data: ClickedData | null) => void;
  isLoading: boolean;
  timePeriod?: TimePeriod;
  onTimePeriodChange?: (value: TimePeriod) => void;
  byAccountOptions?: {
    topN?: number;
  };
  allocationOptions?: {
    viewType?: "account-type" | "category";
    selectedMonth?: string;
  };
  totalOptions?: {
    viewType?: "absolute" | "percentage";
  };
  projectionOptions?: {
    viewType?: "absolute" | "percentage";
    selectedScenario?: string | null;
  };
}

export function ChartDisplay({
  chartType,
  chartData,
  clickedData,
  setClickedData,
  isLoading,
  timePeriod,
  onTimePeriodChange,
  byAccountOptions = { topN: undefined },
  allocationOptions = { viewType: "account-type", selectedMonth: undefined },
  totalOptions = { viewType: "absolute" },
  projectionOptions = { viewType: "absolute", selectedScenario: null },
}: ChartDisplayProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const { getChartCurrency } = useDisplayCurrency();
  const chartCurrency = getChartCurrency() as Currency;
  const { projectionData: projectionDataFromContext } = useProjection();

  // Hover state management - all hooks must be called before any early returns
  const [hoveredData, setHoveredData] = useState<HoveredData | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isTouchingRef = useRef(false);

  // Ref to track the last processed data to avoid infinite loops
  const lastProcessedDataRef = useRef<{
    month: string | null;
    active: boolean;
  }>({
    month: null,
    active: false,
  });

  // Touch event handlers for mobile
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      isTouchingRef.current = true;
      // Find the nearest data point based on touch position
      // This is a simplified version - Recharts handles most of this internally
      // The tooltip handler will be called by Recharts
    };

    const handleTouchEnd = () => {
      // Delay clearing hover to prevent flicker
      setTimeout(() => {
        if (!isTouchingRef.current) {
          setHoveredData(null);
        }
        isTouchingRef.current = false;
      }, 100);
    };

    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  // Calculate responsive bar size based on data length and screen size
  const getBarSize = (dataLength: number) => {
    if (!width) return 40; // fallback during SSR

    const availableWidth = width - 120; // Account for margins and padding
    const maxBarWidth = availableWidth / dataLength;

    if (width < 640) {
      // mobile
      return Math.max(15, Math.min(50, maxBarWidth * 0.8));
    } else if (width < 1024) {
      // tablet
      return Math.max(25, Math.min(70, maxBarWidth * 0.7));
    } else {
      // desktop
      return Math.max(30, Math.min(80, maxBarWidth * 0.6));
    }
  };

  // Get responsive font size
  const getFontSize = () => {
    if (!width) return 10;
    return width < 640 ? 9 : width < 1024 ? 10 : 11;
  };

  // Get responsive margins (reduced bottom margin since no x-axis)
  const getMargins = () => {
    if (!width) return { top: 20, right: 20, left: 20, bottom: 10 };

    if (width < 640) {
      return { top: 15, right: 10, left: 15, bottom: 10 };
    } else if (width < 1024) {
      return { top: 20, right: 15, left: 20, bottom: 10 };
    } else {
      return { top: 20, right: 20, left: 25, bottom: 10 };
    }
  };

  const fontSize = getFontSize();
  const margins = getMargins();

  // Handle bar click
  const handleBarClick = (
    data: {
      month: string;
      netWorth?: number;
      [key: string]: number | string | undefined;
    },
    month: string
  ) => {
    if (chartType === "by-account") {
      // For accounts view, we need to find the month's data
      const monthData = chartData.accountData.find((d) => d.month === month);
      if (monthData) {
        setClickedData({ month, data: monthData, chartType });
      }
    } else if (chartType === "waterfall") {
      // For waterfall, find the processed data
      const reversedSourceData = [...chartData.sourceData].reverse();
      const reversedNetWorthData = [...chartData.netWorthData].reverse();
      const waterfallData = reversedSourceData.map((item, index) => {
        const previousNetWorth =
          index > 0
            ? reversedNetWorthData[index - 1].netWorth
            : reversedNetWorthData[0].netWorth;
        const currentNetWorth =
          reversedNetWorthData[index]?.netWorth || previousNetWorth;
        return {
          month: item.month,
          monthKey: item.monthKey,
          "Starting Balance": previousNetWorth,
          "Savings from Income": item["Savings from Income"] || 0,
          "Interest Earned": item["Interest Earned"] || 0,
          "Capital Gains": item["Capital Gains"] || 0,
          "Ending Balance": currentNetWorth,
          breakdown: item.breakdown,
        };
      });
      const monthData = waterfallData.find((d) => d.month === month);
      if (monthData) {
        setClickedData({
          month,
          data: monthData,
          chartType,
        });
      }
    } else if (chartType === "assets-vs-liabilities") {
      // For assets vs liabilities, find the processed data
      const assetsVsLiabilitiesData = chartData.netWorthData.map((item) => {
        if (!item.accountBalances) {
          return {
            month: item.month,
            monthKey: item.monthKey,
            Assets: item.netWorth > 0 ? item.netWorth : 0,
            Liabilities: item.netWorth < 0 ? Math.abs(item.netWorth) : 0,
            "Net Worth": item.netWorth,
          };
        }
        const assets = item.accountBalances
          .filter((acc) => !acc.isLiability)
          .reduce((sum, acc) => sum + acc.balance, 0);
        const liabilities = item.accountBalances
          .filter((acc) => acc.isLiability)
          .reduce((sum, acc) => sum + acc.balance, 0);
        return {
          month: item.month,
          monthKey: item.monthKey,
          Assets: assets,
          Liabilities: liabilities,
          "Net Worth": item.netWorth,
        };
      });
      const monthData = assetsVsLiabilitiesData.find((d) => d.month === month);
      if (monthData) {
        setClickedData({ month, data: monthData, chartType });
      }
    } else {
      setClickedData({ month, data, chartType });
    }
  };

  // Helper to extract hovered data from chart payload
  const extractHoveredData = (
    payload: any,
    chartType: ChartType
  ): HoveredData | null => {
    if (!payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;
    if (!dataPoint) return null;

    const month = dataPoint.month || "";
    const date = month; // Can be enhanced to format date properly

    const metrics: Record<string, number | string> = {};
    let primaryValue: number | undefined;

    // Extract values based on chart type
    switch (chartType) {
      case "total": {
        primaryValue = dataPoint["Net Worth"] as number;
        Object.keys(dataPoint).forEach((key) => {
          if (
            key !== "month" &&
            key !== "monthKey" &&
            typeof dataPoint[key] === "number"
          ) {
            metrics[key] = dataPoint[key] as number;
          }
        });
        break;
      }
      case "assets-vs-liabilities": {
        primaryValue = dataPoint["Net Worth"] as number;
        metrics["Assets"] = dataPoint["Assets"] as number;
        metrics["Liabilities"] = dataPoint["Liabilities"] as number;
        metrics["Net Worth"] = primaryValue;
        break;
      }
      case "monthly-growth-rate": {
        primaryValue = dataPoint["Growth Rate"] as number;
        metrics["Growth Rate"] = primaryValue;
        metrics["netWorth"] = dataPoint["netWorth"] as number;
        break;
      }
      case "by-account": {
        // Calculate total from all account values
        let total = 0;
        Object.keys(dataPoint).forEach((key) => {
          if (
            key !== "month" &&
            key !== "monthKey" &&
            typeof dataPoint[key] === "number"
          ) {
            const val = dataPoint[key] as number;
            total += val;
            metrics[key] = val;
          }
        });
        primaryValue = total;
        metrics["Total"] = total;
        break;
      }
      case "by-wealth-source": {
        const savings = dataPoint["Savings from Income"] as number;
        const interest = dataPoint["Interest Earned"] as number;
        const gains = dataPoint["Capital Gains"] as number;
        metrics["Savings from Income"] = savings || 0;
        metrics["Interest Earned"] = interest || 0;
        metrics["Capital Gains"] = gains || 0;
        primaryValue = (savings || 0) + (interest || 0) + (gains || 0);
        break;
      }
      case "savings-rate": {
        primaryValue = dataPoint["Savings Rate"] as number;
        metrics["Savings Rate"] = primaryValue;
        metrics["Total Income"] = dataPoint["Total Income"] as number;
        metrics["Savings from Income"] = dataPoint[
          "Savings from Income"
        ] as number;
        break;
      }
      case "waterfall": {
        primaryValue = dataPoint["Ending Balance"] as number;
        metrics["Starting Balance"] = dataPoint["Starting Balance"] as number;
        metrics["Savings from Income"] = dataPoint[
          "Savings from Income"
        ] as number;
        metrics["Interest Earned"] = dataPoint["Interest Earned"] as number;
        metrics["Capital Gains"] = dataPoint["Capital Gains"] as number;
        metrics["Ending Balance"] = primaryValue;
        break;
      }
      case "projection": {
        primaryValue = dataPoint["Net Worth"] as number;
        metrics["Net Worth"] = primaryValue;
        Object.keys(dataPoint).forEach((key) => {
          if (
            key !== "month" &&
            key !== "monthKey" &&
            typeof dataPoint[key] === "number"
          ) {
            metrics[key] = dataPoint[key] as number;
          }
        });
        break;
      }
    }

    return {
      date,
      month,
      primaryValue,
      metrics,
    };
  };

  // Calculate latest data for initial display
  const latestData = useMemo(() => {
    if (!chartData) return null;

    switch (chartType) {
      case "total": {
        const latest =
          chartData.netWorthData[chartData.netWorthData.length - 1];
        if (!latest) return null;
        const accountTypeData = chartData.accountTypeData.find(
          (d) => d.monthKey === latest.monthKey
        );
        const metrics: Record<string, number | string> = {
          "Net Worth": latest.netWorth,
        };
        if (accountTypeData) {
          const netWorth = latest.netWorth;
          const absNetWorth = Math.abs(netWorth);
          Object.keys(accountTypeData).forEach((key) => {
            if (
              key !== "month" &&
              key !== "monthKey" &&
              typeof accountTypeData[key] === "number"
            ) {
              const balance = accountTypeData[key] as number;
              // If in percentage view, convert to percentage; otherwise use absolute value
              if (totalOptions?.viewType === "percentage") {
                metrics[key] =
                  absNetWorth > 0 ? (balance / absNetWorth) * 100 : 0;
              } else {
                metrics[key] = balance;
              }
            }
          });
        }
        return {
          date: latest.month,
          month: latest.month,
          primaryValue: latest.netWorth,
          metrics,
        };
      }
      case "assets-vs-liabilities": {
        const latest =
          chartData.netWorthData[chartData.netWorthData.length - 1];
        if (!latest) return null;
        const assets =
          latest.accountBalances
            ?.filter((acc) => !acc.isLiability)
            .reduce((sum, acc) => sum + acc.balance, 0) || 0;
        const liabilities =
          latest.accountBalances
            ?.filter((acc) => acc.isLiability)
            .reduce((sum, acc) => sum + acc.balance, 0) || 0;
        return {
          date: latest.month,
          month: latest.month,
          primaryValue: latest.netWorth,
          metrics: {
            Assets: assets,
            Liabilities: liabilities,
            "Net Worth": latest.netWorth,
          },
        };
      }
      case "monthly-growth-rate": {
        if (chartData.netWorthData.length < 2) return null;
        const latest =
          chartData.netWorthData[chartData.netWorthData.length - 1];
        const previous =
          chartData.netWorthData[chartData.netWorthData.length - 2];
        const growthRate =
          previous.netWorth !== 0
            ? ((latest.netWorth - previous.netWorth) /
                Math.abs(previous.netWorth)) *
              100
            : 0;
        return {
          date: latest.month,
          month: latest.month,
          primaryValue: growthRate,
          metrics: {
            "Growth Rate": growthRate,
            netWorth: latest.netWorth,
          },
        };
      }
      case "by-account": {
        const latest = chartData.accountData[chartData.accountData.length - 1];
        if (!latest) return null;
        let total = 0;
        const metrics: Record<string, number | string> = {};
        Object.keys(latest).forEach((key) => {
          if (
            key !== "month" &&
            key !== "monthKey" &&
            typeof latest[key] === "number"
          ) {
            const val = latest[key] as number;
            total += val;
            metrics[key] = val;
          }
        });
        return {
          date: latest.month,
          month: latest.month,
          primaryValue: total,
          metrics: { ...metrics, Total: total },
        };
      }
      case "by-wealth-source": {
        const latest = chartData.sourceData[chartData.sourceData.length - 1];
        if (!latest) return null;
        const savings = latest["Savings from Income"] || 0;
        const interest = latest["Interest Earned"] || 0;
        const gains = latest["Capital Gains"] || 0;
        return {
          date: latest.month,
          month: latest.month,
          primaryValue: savings + interest + gains,
          metrics: {
            "Savings from Income": savings,
            "Interest Earned": interest,
            "Capital Gains": gains,
          },
        };
      }
      case "savings-rate": {
        const latest = chartData.sourceData[chartData.sourceData.length - 1];
        if (!latest) return null;
        return {
          date: latest.month,
          month: latest.month,
          primaryValue: latest["Savings Rate"] || 0,
          metrics: {
            "Savings Rate": latest["Savings Rate"] || 0,
            "Total Income": latest["Total Income"] || 0,
            "Savings from Income": latest["Savings from Income"] || 0,
          },
        };
      }
      case "allocation": {
        // For allocation, use selected month or latest
        const sourceData =
          allocationOptions.viewType === "category"
            ? chartData.categoryData
            : chartData.accountTypeData;
        const selected = allocationOptions.selectedMonth
          ? sourceData.find((d) => d.month === allocationOptions.selectedMonth)
          : sourceData[sourceData.length - 1];
        if (!selected) return null;
        let total = 0;
        Object.keys(selected).forEach((key) => {
          if (
            key !== "month" &&
            key !== "monthKey" &&
            typeof selected[key] === "number"
          ) {
            total += Math.abs(selected[key] as number);
          }
        });
        return {
          date: selected.month,
          month: selected.month,
          primaryValue: total,
          metrics: {},
        };
      }
      case "waterfall": {
        const latestSource =
          chartData.sourceData[chartData.sourceData.length - 1];
        const latestNetWorth =
          chartData.netWorthData[chartData.netWorthData.length - 1];
        if (!latestSource || !latestNetWorth) return null;
        const previousNetWorth =
          chartData.netWorthData.length > 1
            ? chartData.netWorthData[chartData.netWorthData.length - 2].netWorth
            : latestNetWorth.netWorth;
        return {
          date: latestSource.month,
          month: latestSource.month,
          primaryValue: latestNetWorth.netWorth,
          metrics: {
            "Starting Balance": previousNetWorth,
            "Savings from Income": latestSource["Savings from Income"] || 0,
            "Interest Earned": latestSource["Interest Earned"] || 0,
            "Capital Gains": latestSource["Capital Gains"] || 0,
            "Ending Balance": latestNetWorth.netWorth,
          },
        };
      }
      case "projection": {
        if (
          !projectionDataFromContext ||
          !projectionDataFromContext.projectionData ||
          projectionDataFromContext.projectionData.length === 0
        ) {
          return null;
        }
        const latest =
          projectionDataFromContext.projectionData[
            projectionDataFromContext.projectionData.length - 1
          ];
        const metrics: Record<string, number | string> = {
          "Net Worth": latest.netWorth,
        };
        // Add account type breakdown
        latest.accountBalances.forEach((acc) => {
          const current = (metrics[acc.accountType] as number) || 0;
          metrics[acc.accountType] = current + acc.balance;
        });
        return {
          date: latest.month,
          month: latest.month,
          primaryValue: latest.netWorth,
          metrics,
        };
      }
      default:
        return null;
    }
  }, [chartData, chartType, allocationOptions, projectionDataFromContext]);

  // Custom tooltip that updates header instead of showing tooltip
  const HeaderUpdateTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    // Extract the month from payload to use as a stable identifier
    const currentMonth = (payload?.[0]?.payload?.month as string) || null;

    useEffect(() => {
      const lastProcessed = lastProcessedDataRef.current;

      // Only update if something actually changed
      if (active && payload && payload.length) {
        if (currentMonth !== lastProcessed.month || !lastProcessed.active) {
          const hoverData = extractHoveredData(payload, chartType);
          lastProcessedDataRef.current = { month: currentMonth, active: true };
          setHoveredData(hoverData);
        }
      } else if (!active && lastProcessed.active) {
        // Clear when no longer active
        lastProcessedDataRef.current = { month: null, active: false };
        setHoveredData(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, currentMonth, chartType]); // payload intentionally omitted to avoid infinite loops

    // Return null to hide the tooltip (we're using header instead)
    return null;
  };

  // Format account type names for display (shared helper)
  const formatAccountTypeName = (type: string): string => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const renderChart = () => {
    switch (chartType) {
      case "total":
        // Get all account types from accountTypeData
        const totalAllAccountTypes = new Set<string>();
        chartData.accountTypeData.forEach((point) => {
          Object.keys(point).forEach((key) => {
            if (
              key !== "month" &&
              key !== "monthKey" &&
              !key.endsWith("_currencies")
            ) {
              totalAllAccountTypes.add(key);
            }
          });
        });

        const totalAccountTypesArray = Array.from(totalAllAccountTypes).sort();

        // Format data for chart with account type breakdown
        const totalChartData = chartData.accountTypeData.map((point) => {
          const dataPoint: Record<string, string | number> = {
            month: point.month,
            monthKey: point.monthKey,
            "Net Worth":
              chartData.netWorthData.find(
                (nw) => nw.monthKey === point.monthKey
              )?.netWorth || 0,
          };

          // Get net worth for percentage calculation
          const netWorth = dataPoint["Net Worth"] as number;

          // Add account type values
          totalAccountTypesArray.forEach((type) => {
            const balance = (point[type] as number) || 0;
            if (totalOptions?.viewType === "percentage") {
              // Calculate percentage of net worth, allowing negative for liabilities
              // Use absolute net worth for denominator but preserve sign of balance
              const absNetWorth = Math.abs(netWorth);
              dataPoint[type] =
                absNetWorth > 0 ? (balance / absNetWorth) * 100 : 0;
            } else {
              dataPoint[type] = balance;
            }
          });

          return dataPoint;
        });

        // Create chart config for account types
        const totalChartConfig: Record<
          string,
          { label: string; color: string }
        > = {
          "Net Worth": {
            label: "Net Worth",
            color: "hsl(var(--chart-1))",
          },
        };

        totalAccountTypesArray.forEach((type, index) => {
          totalChartConfig[type] = {
            label: formatAccountTypeName(type),
            color: COLORS[index % COLORS.length],
          };
        });

        const isTotalPercentage = totalOptions?.viewType === "percentage";

        // Calculate actual min/max values from all data points for tighter Y-axis
        let yAxisMin: number | string = 0;
        let yAxisMax: number | string = "auto";

        if (isTotalPercentage) {
          // For percentage, find min/max across all account types
          const allValues: number[] = [];
          totalChartData.forEach((point) => {
            totalAccountTypesArray.forEach((type) => {
              const value = point[type] as number;
              if (typeof value === "number" && !isNaN(value)) {
                allValues.push(value);
              }
            });
          });
          if (allValues.length > 0) {
            const min = Math.min(...allValues);
            const max = Math.max(...allValues);
            // Add some padding (5% of range)
            const padding = (max - min) * 0.05;
            yAxisMin = Math.min(0, min - padding); // Allow negative, but start from 0 if all positive
            yAxisMax = max + padding;
          } else {
            yAxisMin = 0;
            yAxisMax = 100;
          }
        } else {
          // For absolute values, find min/max across all account types
          const allValues: number[] = [];
          totalChartData.forEach((point) => {
            totalAccountTypesArray.forEach((type) => {
              const value = point[type] as number;
              if (typeof value === "number" && !isNaN(value)) {
                allValues.push(value);
              }
            });
          });
          if (allValues.length > 0) {
            const min = Math.min(...allValues);
            const max = Math.max(...allValues);
            // Add some padding (5% of range)
            const padding = (max - min) * 0.05;
            yAxisMin = min < 0 ? min - padding : 0; // Start at 0 if all positive
            yAxisMax = max + padding;
          }
        }

        return (
          <ChartContainer
            config={totalChartConfig}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={totalChartData} margin={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isTotalPercentage
                      ? `${value.toFixed(0)}%` // Never mask percentages
                      : isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={[yAxisMin, yAxisMax]}
                />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                <Legend />
                {totalAccountTypesArray.map((type, index) => (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stackId="total"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.6}
                    isAnimationActive={false}
                    onClick={(data) => {
                      if ("payload" in data) {
                        const payload = data.payload as {
                          month: string;
                          monthKey: string;
                          [key: string]: string | number;
                        };
                        const netWorth = payload["Net Worth"] as number;
                        handleBarClick(
                          { month: payload.month, netWorth },
                          payload.month
                        );
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "assets-vs-liabilities":
        // Process data to separate assets and liabilities
        const assetsVsLiabilitiesData = chartData.netWorthData.map((item) => {
          if (!item.accountBalances) {
            return {
              month: item.month,
              monthKey: item.monthKey,
              Assets: item.netWorth > 0 ? item.netWorth : 0,
              Liabilities: item.netWorth < 0 ? Math.abs(item.netWorth) : 0,
              "Net Worth": item.netWorth,
            };
          }

          const assets = item.accountBalances
            .filter((acc) => !acc.isLiability)
            .reduce((sum, acc) => sum + acc.balance, 0);

          const liabilities = item.accountBalances
            .filter((acc) => acc.isLiability)
            .reduce((sum, acc) => sum + acc.balance, 0);

          // Net Worth = Assets - Liabilities
          const netWorth = assets - liabilities;

          return {
            month: item.month,
            monthKey: item.monthKey,
            Assets: assets,
            Liabilities: liabilities,
            "Net Worth": netWorth,
          };
        });

        return (
          <ChartContainer
            config={{
              Assets: {
                label: "Assets",
                color: "hsl(var(--chart-2))",
              },
              Liabilities: {
                label: "Liabilities",
                color: "hsl(var(--chart-3))",
              },
              "Net Worth": {
                label: "Net Worth",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={assetsVsLiabilitiesData} margin={margins}>
                <defs>
                  <linearGradient
                    id="assetsGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-2))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="liabilitiesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-3))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="netWorthLineGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="Assets"
                  stackId="1"
                  stroke="hsl(var(--chart-2))"
                  fill="url(#assetsGradient)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="Liabilities"
                  stackId="1"
                  stroke="hsl(var(--chart-3))"
                  fill="url(#liabilitiesGradient)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="Net Worth"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#netWorthLineGradient)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        Assets: number;
                        Liabilities: number;
                        "Net Worth": number;
                      };
                      handleBarClick(
                        {
                          month: payload.month,
                          Assets: payload.Assets,
                          Liabilities: payload.Liabilities,
                          "Net Worth": payload["Net Worth"],
                        },
                        payload.month
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "monthly-growth-rate":
        // Calculate month-over-month growth rate
        const growthRateData = chartData.netWorthData.map((item, index) => {
          if (index === 0) {
            return {
              month: item.month,
              monthKey: item.monthKey,
              "Growth Rate": 0,
              netWorth: item.netWorth,
            };
          }
          const previousItem = chartData.netWorthData[index - 1];
          const previousNetWorth = previousItem.netWorth;
          const currentNetWorth = item.netWorth;
          const growthRate =
            previousNetWorth !== 0
              ? ((currentNetWorth - previousNetWorth) /
                  Math.abs(previousNetWorth)) *
                100
              : 0;

          return {
            month: item.month,
            monthKey: item.monthKey,
            "Growth Rate": Number(growthRate.toFixed(2)),
            netWorth: currentNetWorth,
          };
        });

        return (
          <ChartContainer
            config={{
              "Growth Rate": {
                label: "Growth Rate (%)",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthRateData} margin={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="Growth Rate"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(var(--chart-1))" }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        "Growth Rate": number;
                        netWorth: number;
                      };
                      handleBarClick(
                        {
                          month: payload.month,
                          "Growth Rate": payload["Growth Rate"],
                          netWorth: payload.netWorth,
                        },
                        payload.month
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "by-account":
        // Get latest month's data for sorting
        const latestAccountData =
          chartData.accountData[chartData.accountData.length - 1] ||
          chartData.accountData[0];

        // Always sort by current value (largest to smallest)
        let accountsToDisplay = chartData.accounts
          .map((account) => {
            const uniqueName = `${account.name} (${account.type}${
              account.isISA ? " ISA" : ""
            })`;
            const currentValue = latestAccountData
              ? (latestAccountData[uniqueName] as number | undefined) || 0
              : 0;
            return { account, currentValue: Math.abs(currentValue) };
          })
          .sort((a, b) => b.currentValue - a.currentValue)
          .map((item) => item.account);

        // Apply top N filter if specified
        if (byAccountOptions?.topN && byAccountOptions.topN > 0) {
          accountsToDisplay = accountsToDisplay.slice(0, byAccountOptions.topN);
        }

        const accountBarSize = getBarSize(chartData.accountData.length);
        // Always stack bars
        const stackId = "by-account-stack";

        return (
          <ChartContainer
            config={accountsToDisplay.reduce(
              (config, account, index) => ({
                ...config,
                [`${account.name} (${account.type}${
                  account.isISA ? " ISA" : ""
                })`]: {
                  label: `${account.name} (${account.type}${
                    account.isISA ? " ISA" : ""
                  })`,
                  color: COLORS[index % COLORS.length],
                },
              }),
              {}
            )}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData.accountData}
                margin={margins}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                {accountsToDisplay.map((account, index) => {
                  const uniqueName = `${account.name} (${account.type}${
                    account.isISA ? " ISA" : ""
                  })`;
                  const hasData = chartData.accountData.some((monthData) => {
                    const value = monthData[uniqueName] as number | undefined;
                    return value !== undefined && value !== null && value !== 0;
                  });
                  if (hasData) {
                    return (
                      <Bar
                        key={account.id}
                        dataKey={uniqueName}
                        fill={COLORS[index % COLORS.length]}
                        maxBarSize={accountBarSize}
                        stackId={stackId}
                        onClick={(data) => handleBarClick(data, data.month)}
                        style={{ cursor: "pointer" }}
                        isAnimationActive={false}
                      />
                    );
                  }
                  return null;
                })}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "by-wealth-source":
        const sourceKeys = [
          "Savings from Income",
          "Interest Earned",
          "Capital Gains",
        ] as const;
        return (
          <ChartContainer
            config={sourceKeys.reduce(
              (config, source, index) => ({
                ...config,
                [source]: {
                  label: source,
                  color: COLORS[index % COLORS.length],
                },
              }),
              {}
            )}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.sourceData} margin={margins}>
                <defs>
                  {sourceKeys.map((source, index) => (
                    <linearGradient
                      key={source}
                      id={`${source.replace(/\s+/g, "")}Gradient`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS[index % COLORS.length]}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS[index % COLORS.length]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  fontSize={fontSize}
                  angle={width && width < 640 ? -60 : -45}
                  textAnchor="end"
                  height={margins.bottom + 10}
                  interval={width && width < 640 ? "preserveStartEnd" : 0}
                  tick={{ fontSize }}
                />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                {sourceKeys.map((source, index) => {
                  const hasData = chartData.sourceData.some(
                    (monthData) => (monthData[source] || 0) !== 0
                  );
                  if (hasData) {
                    return (
                      <Area
                        key={source}
                        type="monotone"
                        dataKey={source}
                        stackId="1"
                        stroke={COLORS[index % COLORS.length]}
                        fill={`url(#${source.replace(/\s+/g, "")}Gradient)`}
                        strokeWidth={2}
                        isAnimationActive={false}
                        onClick={(data) => {
                          if ("payload" in data) {
                            const payload = data.payload as {
                              month: string;
                              [key: string]: string | number | undefined;
                            };
                            if (payload.month) {
                              handleBarClick(payload, payload.month);
                            }
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    );
                  }
                  return null;
                })}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "savings-rate":
        // Calculate average savings rate for reference line
        const savingsRates = chartData.sourceData
          .map((d) => d["Savings Rate"])
          .filter((rate) => typeof rate === "number" && !isNaN(rate));
        const avgSavingsRate =
          savingsRates.length > 0
            ? savingsRates.reduce((sum, rate) => sum + rate, 0) /
              savingsRates.length
            : 0;

        return (
          <ChartContainer
            config={{
              "Savings Rate": {
                label: "Savings Rate",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.sourceData} margin={margins}>
                <defs>
                  <linearGradient
                    id="savingsRateGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="hsl(var(--chart-1))"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) => `${value.toFixed(1)}%`}
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
                <ReferenceLine
                  y={20}
                  stroke="hsl(var(--chart-2))"
                  strokeDasharray="3 3"
                  label={{ value: "20% Target", position: "right" }}
                />
                <ReferenceLine
                  y={avgSavingsRate}
                  stroke="hsl(var(--chart-3))"
                  strokeDasharray="2 2"
                  label={{
                    value: `Avg: ${avgSavingsRate.toFixed(1)}%`,
                    position: "right",
                  }}
                />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="Savings Rate"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#savingsRateGradient)"
                  strokeWidth={2}
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        "Savings Rate": number;
                      };
                      handleBarClick(
                        {
                          month: payload.month,
                          "Savings Rate": payload["Savings Rate"],
                        },
                        payload.month
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "allocation":
        // Determine which data source to use based on view type
        const sourceDataArray =
          allocationOptions.viewType === "category"
            ? chartData.categoryData
            : chartData.accountTypeData;

        // Get selected month's data or most recent (last item since data is sorted asc)
        const selectedMonthData = allocationOptions.selectedMonth
          ? sourceDataArray.find(
              (item) =>
                item.month === allocationOptions.selectedMonth ||
                item.monthKey === allocationOptions.selectedMonth
            )
          : sourceDataArray.length > 0
          ? sourceDataArray[sourceDataArray.length - 1]
          : null;

        if (!selectedMonthData) {
          return (
            <div className="h-[250px] sm:h-[350px] md:h-[400px] w-full flex items-center justify-center">
              <div className="text-muted-foreground">No data available</div>
            </div>
          );
        }

        // Extract values (exclude month and monthKey)
        const allocationData = Object.entries(selectedMonthData)
          .filter(
            ([key]) =>
              key !== "month" &&
              key !== "monthKey" &&
              typeof selectedMonthData[key] === "number" &&
              Math.abs(selectedMonthData[key] as number) > 0
          )
          .map(([name, value], index) => ({
            name,
            value: Math.abs(value as number),
            fill: COLORS[index % COLORS.length],
          }))
          .sort((a, b) => b.value - a.value); // Sort by value descending

        const totalAllocation = allocationData.reduce(
          (sum, item) => sum + item.value,
          0
        );

        const CustomPieTooltip = ({
          active,
          payload,
        }: {
          active?: boolean;
          payload?: Array<{
            name: string;
            value: number;
            payload?: PieTooltipPayload;
          }>;
        }) => {
          if (active && payload && payload.length) {
            const data = payload[0];
            const fill = data.payload?.fill || COLORS[0];
            const percentage =
              totalAllocation > 0
                ? ((data.value / totalAllocation) * 100).toFixed(1)
                : "0";
            return (
              <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                <p className="font-medium mb-2">{data.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: fill }}
                  />
                  <span>
                    {isMasked
                      ? "••••••"
                      : formatCurrencyAmount(data.value, chartCurrency)}
                  </span>
                  <span className="text-muted-foreground">({percentage}%)</span>
                </div>
              </div>
            );
          }
          return null;
        };

        const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({
          cx,
          cy,
          midAngle,
          innerRadius,
          outerRadius,
          percent,
        }: PieLabelProps) => {
          if (percent < 0.05) return null; // Don't show label if slice is too small
          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
          const x = cx + radius * Math.cos(-midAngle * RADIAN);
          const y = cy + radius * Math.sin(-midAngle * RADIAN);

          return (
            <text
              x={x}
              y={y}
              fill="white"
              textAnchor={x > cx ? "start" : "end"}
              dominantBaseline="central"
              fontSize={12}
              fontWeight="bold"
            >
              {`${(percent * 100).toFixed(0)}%`}
            </text>
          );
        };

        return (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              {allocationOptions.viewType === "category"
                ? "Category"
                : "Account Type"}{" "}
              Allocation as of {selectedMonthData.month}
            </div>
            <ChartContainer
              config={allocationData.reduce(
                (config, item) => ({
                  ...config,
                  [item.name]: {
                    label: item.name,
                    color: item.fill,
                  },
                }),
                {} as Record<string, { label: string; color: string }>
              )}
              className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={width && width < 640 ? 80 : 100}
                    innerRadius={width && width < 640 ? 40 : 50}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={false}
                    onClick={(data) => {
                      handleBarClick(
                        {
                          month: selectedMonthData.month,
                          [data.name]: data.value,
                        },
                        selectedMonthData.month
                      );
                    }}
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => {
                      const entryValue = (entry.payload as { value?: number })
                        ?.value;
                      const percentage =
                        totalAllocation > 0 && entryValue
                          ? ((entryValue / totalAllocation) * 100).toFixed(1)
                          : "0";
                      return `${value} (${percentage}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="text-center text-xs text-muted-foreground">
              Total:{" "}
              {isMasked
                ? "••••••"
                : formatCurrencyAmount(totalAllocation, chartCurrency)}
            </div>
          </div>
        );

      case "waterfall":
        // Process data for waterfall chart showing month-to-month net worth changes
        // For each month, show: Starting Balance (from previous month) -> +Savings -> +Interest -> +Capital Gains
        // Reverse the arrays to work with chronological order (oldest first)
        const reversedSourceData = [...chartData.sourceData].reverse();
        const reversedNetWorthData = [...chartData.netWorthData].reverse();

        const waterfallData = reversedSourceData.map((item, index) => {
          // Get previous month's net worth (starting balance)
          const previousNetWorth =
            index > 0
              ? reversedNetWorthData[index - 1].netWorth
              : reversedNetWorthData[0].netWorth;

          // Get current month's net worth (ending balance)
          const currentNetWorth =
            reversedNetWorthData[index]?.netWorth || previousNetWorth;

          const savingsFromIncome = item["Savings from Income"] || 0;
          const interestEarned = item["Interest Earned"] || 0;
          const capitalGains = item["Capital Gains"] || 0;

          return {
            month: item.month,
            monthKey: item.monthKey,
            "Starting Balance": previousNetWorth,
            "Savings from Income": savingsFromIncome,
            "Interest Earned": interestEarned,
            "Capital Gains": capitalGains,
            "Ending Balance": currentNetWorth,
            // Store breakdown for details panel
            breakdown: item.breakdown,
          };
        });

        return (
          <ChartContainer
            config={{
              "Starting Balance": {
                label: "Starting Balance",
                color: "hsl(var(--chart-4))",
              },
              "Savings from Income": {
                label: "Savings from Income",
                color: COLORS[0],
              },
              "Interest Earned": {
                label: "Interest Earned",
                color: COLORS[1],
              },
              "Capital Gains": {
                label: "Capital Gains",
                color: COLORS[2],
              },
              "Ending Balance": {
                label: "Ending Balance",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={["auto", "auto"]}
                  allowDataOverflow={true}
                />
                <ReferenceLine y={0} stroke="#666" />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                {/* Starting Balance - transparent bar for positioning */}
                <Bar
                  dataKey="Starting Balance"
                  fill="transparent"
                  stackId="waterfall"
                  isAnimationActive={false}
                />
                {/* Savings from Income */}
                <Bar
                  dataKey="Savings from Income"
                  fill={COLORS[0]}
                  stackId="waterfall"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handleBarClick(payload, payload.month);
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                {/* Interest Earned */}
                <Bar
                  dataKey="Interest Earned"
                  fill={COLORS[1]}
                  stackId="waterfall"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handleBarClick(payload, payload.month);
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
                {/* Capital Gains - can be negative */}
                <Bar
                  dataKey="Capital Gains"
                  fill={COLORS[2]}
                  stackId="waterfall"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handleBarClick(payload, payload.month);
                      }
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "projection":
        if (
          !projectionDataFromContext ||
          !projectionDataFromContext.projectionData ||
          projectionDataFromContext.projectionData.length === 0
        ) {
          return (
            <div className="flex flex-col items-center justify-center h-[300px] sm:h-[400px] text-center">
              <p className="text-muted-foreground mb-2">
                No projection data available
              </p>
              <p className="text-sm text-muted-foreground">
                Calculate a projection in the Wealth Projection Setup section
                below, or select a saved scenario.
              </p>
            </div>
          );
        }

        // Group account balances by account type
        const projectionAllAccountTypes = new Set<string>();

        projectionDataFromContext.projectionData.forEach((point) => {
          point.accountBalances.forEach((acc) => {
            projectionAllAccountTypes.add(acc.accountType);
          });
        });

        const projectionAccountTypesArray = Array.from(
          projectionAllAccountTypes
        ).sort();

        // Format data for chart with account type breakdown
        const projectionChartData =
          projectionDataFromContext.projectionData.map((point) => {
            const monthFormatted = new Date(
              point.month + "-01"
            ).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            });

            const dataPoint: Record<string, string | number> = {
              month: monthFormatted,
              monthKey: point.month,
              "Net Worth": point.netWorth,
            };

            // Sum balances by account type
            const typeBalances = new Map<string, number>();
            point.accountBalances.forEach((acc) => {
              const current = typeBalances.get(acc.accountType) || 0;
              typeBalances.set(acc.accountType, current + acc.balance);
            });

            // Add account type values
            projectionAccountTypesArray.forEach((type) => {
              const balance = typeBalances.get(type) || 0;
              if (projectionOptions?.viewType === "percentage") {
                // Calculate percentage of net worth, allowing negative for liabilities
                // Use absolute net worth for denominator but preserve sign of balance
                const absNetWorth = Math.abs(point.netWorth);
                dataPoint[type] =
                  absNetWorth > 0 ? (balance / absNetWorth) * 100 : 0;
              } else {
                dataPoint[type] = balance;
              }
            });

            return dataPoint;
          });

        // Create chart config for account types
        const projectionChartConfig: Record<
          string,
          { label: string; color: string }
        > = {
          "Net Worth": {
            label: "Net Worth",
            color: "hsl(var(--chart-1))",
          },
        };

        projectionAccountTypesArray.forEach((type, index) => {
          projectionChartConfig[type] = {
            label: formatAccountTypeName(type),
            color: COLORS[index % COLORS.length],
          };
        });

        const isPercentage = projectionOptions?.viewType === "percentage";

        // Calculate actual min/max values from all data points for tighter Y-axis
        let projectionYAxisMin: number | string = 0;
        let projectionYAxisMax: number | string = "auto";

        if (isPercentage) {
          // For percentage, find min/max across all account types
          const allProjectionValues: number[] = [];
          projectionChartData.forEach((point) => {
            projectionAccountTypesArray.forEach((type) => {
              const value = point[type] as number;
              if (typeof value === "number" && !isNaN(value)) {
                allProjectionValues.push(value);
              }
            });
          });
          if (allProjectionValues.length > 0) {
            const min = Math.min(...allProjectionValues);
            const max = Math.max(...allProjectionValues);
            // Add some padding (5% of range)
            const padding = (max - min) * 0.05;
            projectionYAxisMin = Math.min(0, min - padding); // Allow negative, but start from 0 if all positive
            projectionYAxisMax = max + padding;
          } else {
            projectionYAxisMin = 0;
            projectionYAxisMax = 100;
          }
        } else {
          // For absolute values, find min/max across all account types
          const allProjectionValues: number[] = [];
          projectionChartData.forEach((point) => {
            projectionAccountTypesArray.forEach((type) => {
              const value = point[type] as number;
              if (typeof value === "number" && !isNaN(value)) {
                allProjectionValues.push(value);
              }
            });
          });
          if (allProjectionValues.length > 0) {
            const min = Math.min(...allProjectionValues);
            const max = Math.max(...allProjectionValues);
            // Add some padding (5% of range)
            const padding = (max - min) * 0.05;
            projectionYAxisMin = min < 0 ? min - padding : 0; // Start at 0 if all positive
            projectionYAxisMax = max + padding;
          }
        }

        return (
          <ChartContainer
            config={projectionChartConfig}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionChartData} margin={margins}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isPercentage
                      ? `${value.toFixed(0)}%` // Never mask percentages
                      : isMasked
                      ? "•••"
                      : formatCurrencyAmount(value / 1000, chartCurrency, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        }) + "K"
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={[projectionYAxisMin, projectionYAxisMax]}
                />
                <ChartTooltip
                  content={<HeaderUpdateTooltip />}
                  cursor={{
                    stroke: "hsl(var(--foreground))",
                    strokeWidth: 1,
                    strokeDasharray: "5 5",
                  }}
                />
                {hoveredData && (
                  <ReferenceLine
                    x={hoveredData.month}
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      fill: "hsl(var(--foreground))",
                      fontSize: 12,
                    }}
                  />
                )}
                <Legend />
                {projectionAccountTypesArray.map((type, index) => (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stackId="projection"
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.6}
                    isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );
    }
  };

  // Early return for loading state - must be after all hooks
  if (isLoading) {
    return (
      <>
        <div className="h-[300px] sm:h-[400px] w-full flex items-center justify-center">
          <div className="text-muted-foreground">Loading chart data...</div>
        </div>
        {/* Period Selector - below the chart */}
        {timePeriod !== undefined && onTimePeriodChange && (
          <div className="mt-4 flex justify-center">
            <PeriodSelector
              value={timePeriod}
              onChange={onTimePeriodChange}
              isLoading={isLoading}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Chart Header */}
      <ChartHeader
        chartType={chartType}
        hoveredData={hoveredData}
        latestData={latestData}
        chartCurrency={chartCurrency}
        totalOptions={totalOptions}
        projectionOptions={projectionOptions}
      />

      {/* Chart Container with touch support */}
      <div ref={chartContainerRef} className="w-full overflow-x-auto">
        {renderChart()}
      </div>

      {/* Period Selector - below the chart */}
      {timePeriod !== undefined && onTimePeriodChange && (
        <div className="mt-4 flex justify-center">
          <PeriodSelector
            value={timePeriod}
            onChange={onTimePeriodChange}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Show clicked data details */}
      {clickedData && (
        <DataDetailsPanel
          clickedData={clickedData}
          onClose={() => setClickedData(null)}
        />
      )}
    </>
  );
}
