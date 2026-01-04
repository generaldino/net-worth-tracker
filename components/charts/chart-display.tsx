"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Line,
  ComposedChart,
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
import { COLORS, CHART_GREEN, CHART_RED, getUniqueColor } from "./constants";
import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { formatCurrencyAmount, formatPercentage } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useProjection } from "@/contexts/projection-context";
import type { TimePeriod } from "@/lib/types";
import { ChartSectionSkeleton } from "@/components/skeletons/chart-skeleton";

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
  byWealthSourceOptions?: {
    viewType?: "cumulative" | "monthly";
  };
  headerControls?: React.ReactNode;
  hiddenCards?: Set<string>;
  onToggleHidden?: (cardName: string) => void;
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
  byWealthSourceOptions = { viewType: "cumulative" },
  headerControls,
  hiddenCards = new Set(),
  onToggleHidden,
}: ChartDisplayProps) {
  const { width } = useWindowSize();
  const { isMasked } = useMasking();
  const { getChartCurrency } = useDisplayCurrency();
  const chartCurrency = getChartCurrency() as Currency;
  const { projectionData: projectionDataFromContext } = useProjection();

  // Hover state management - all hooks must be called before any early returns
  const [hoveredData, setHoveredData] = useState<HoveredData | null>(null);
  const [pinnedData, setPinnedData] = useState<HoveredData | null>(null);
  const [hoveredCardName, setHoveredCardName] = useState<string | null>(null);
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

  // Clear pinned data when chart type or time period changes
  useEffect(() => {
    setPinnedData(null);
  }, [chartType, timePeriod]);

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

  // Get responsive margins (reduced bottom margin since no x-axis, increased top for date labels, increased left/right for horizontal label space)
  const getMargins = () => {
    if (!width) return { top: 50, right: 40, left: 40, bottom: 10 };

    if (width < 640) {
      // Mobile: more space needed for longer date labels
      return { top: 45, right: 35, left: 35, bottom: 10 };
    } else if (width < 1024) {
      return { top: 50, right: 40, left: 40, bottom: 10 };
    } else {
      return { top: 50, right: 45, left: 45, bottom: 10 };
    }
  };

  const fontSize = getFontSize();
  const margins = getMargins();

  // Handle click-to-pin: toggle pinning a month's data for the header cards
  const handlePinToggle = (month: string) => {
    // If clicking the same month that's already pinned, unpin it
    if (pinnedData?.month === month) {
      setPinnedData(null);
      return;
    }

    // Extract the data for this month based on chart type
    let pinData: HoveredData | null = null;

    switch (chartType) {
      case "total": {
        const monthNetWorth = chartData.netWorthData.find(
          (d) => d.month === month
        );
        const accountTypeData = chartData.accountTypeData.find(
          (d) => d.month === month
        );
        if (monthNetWorth) {
          const metrics: Record<string, number | string> = {
            "Net Worth": monthNetWorth.netWorth,
          };
          if (accountTypeData) {
            const netWorth = monthNetWorth.netWorth;
            const absNetWorth = Math.abs(netWorth);
            Object.keys(accountTypeData).forEach((key) => {
              if (
                key !== "month" &&
                key !== "monthKey" &&
                typeof accountTypeData[key] === "number"
              ) {
                const balance = accountTypeData[key] as number;
                if (totalOptions?.viewType === "percentage") {
                  metrics[key] =
                    absNetWorth > 0 ? (balance / absNetWorth) * 100 : 0;
                } else {
                  metrics[key] = balance;
                }
              }
            });
          }
          pinData = {
            date: month,
            month,
            primaryValue: monthNetWorth.netWorth,
            metrics,
          };
        }
        break;
      }
      case "assets-vs-liabilities": {
        const monthData = chartData.netWorthData.find((d) => d.month === month);
        if (monthData) {
          const assets =
            monthData.accountBalances
              ?.filter((acc) => !acc.isLiability)
              .reduce((sum, acc) => sum + acc.balance, 0) || 0;
          const liabilities =
            monthData.accountBalances
              ?.filter((acc) => acc.isLiability)
              .reduce((sum, acc) => sum + Math.abs(acc.balance), 0) || 0;
          pinData = {
            date: month,
            month,
            primaryValue: monthData.netWorth,
            metrics: {
              Assets: assets,
              Liabilities: liabilities,
              "Net Worth": monthData.netWorth,
            },
          };
        }
        break;
      }
      case "monthly-growth-rate": {
        const monthIndex = chartData.netWorthData.findIndex(
          (d) => d.month === month
        );
        if (monthIndex > 0) {
          const current = chartData.netWorthData[monthIndex];
          const previous = chartData.netWorthData[monthIndex - 1];
          const growthRate =
            previous.netWorth !== 0
              ? ((current.netWorth - previous.netWorth) /
                  Math.abs(previous.netWorth)) *
                100
              : 0;
          pinData = {
            date: month,
            month,
            primaryValue: growthRate,
            metrics: {
              "Growth Rate": growthRate,
              netWorth: current.netWorth,
            },
          };
        }
        break;
      }
      case "by-account": {
        const monthData = chartData.accountData.find((d) => d.month === month);
        if (monthData) {
          let total = 0;
          const metrics: Record<string, number | string> = {};
          Object.keys(monthData).forEach((key) => {
            if (
              key !== "month" &&
              key !== "monthKey" &&
              typeof monthData[key] === "number"
            ) {
              const val = monthData[key] as number;
              total += val;
              metrics[key] = val;
            }
          });
          pinData = {
            date: month,
            month,
            primaryValue: total,
            metrics: { ...metrics, Total: total },
          };
        }
        break;
      }
      case "by-wealth-source": {
        const monthData = chartData.sourceData.find((d) => d.month === month);
        if (monthData) {
          const savings = monthData["Savings from Income"] || 0;
          const interest = monthData["Interest Earned"] || 0;
          const gains = monthData["Capital Gains"] || 0;
          pinData = {
            date: month,
            month,
            primaryValue: savings + interest + gains,
            metrics: {
              "Savings from Income": savings,
              "Interest Earned": interest,
              "Capital Gains": gains,
            },
          };
        }
        break;
      }
      case "waterfall": {
        const monthIndex = chartData.sourceData.findIndex(
          (d) => d.month === month
        );
        const monthSource = chartData.sourceData[monthIndex];
        const monthNetWorth = chartData.netWorthData[monthIndex];
        const prevNetWorth =
          monthIndex > 0
            ? chartData.netWorthData[monthIndex - 1]?.netWorth
            : monthNetWorth?.netWorth || 0;
        if (monthSource && monthNetWorth) {
          pinData = {
            date: month,
            month,
            primaryValue: monthNetWorth.netWorth,
            metrics: {
              "Starting Balance": prevNetWorth,
              "Savings from Income": monthSource["Savings from Income"] || 0,
              "Interest Earned": monthSource["Interest Earned"] || 0,
              "Capital Gains": monthSource["Capital Gains"] || 0,
              "Ending Balance": monthNetWorth.netWorth,
            },
          };
        }
        break;
      }
      case "savings-rate": {
        const monthData = chartData.sourceData.find((d) => d.month === month);
        if (monthData) {
          pinData = {
            date: month,
            month,
            primaryValue: monthData["Savings Rate"] || 0,
            metrics: {
              "Savings Rate": monthData["Savings Rate"] || 0,
              "Total Income": monthData["Total Income"] || 0,
              "Total Expenditure": monthData["Total Expenditure"] || 0,
              "Savings from Income": monthData["Savings from Income"] || 0,
            },
          };
        }
        break;
      }
      case "projection": {
        if (projectionDataFromContext?.projectionData) {
          const monthData = projectionDataFromContext.projectionData.find(
            (d) => d.month === month
          );
          if (monthData) {
            const metrics: Record<string, number | string> = {
              "Net Worth": monthData.netWorth,
            };
            monthData.accountBalances.forEach((acc) => {
              const current = (metrics[acc.accountType] as number) || 0;
              metrics[acc.accountType] = current + acc.balance;
            });
            // Format the month for display (convert "2024-12" to "Dec 2024")
            const formattedMonth = new Date(month + "-01").toLocaleDateString(
              "en-GB",
              { month: "short", year: "numeric" }
            );
            pinData = {
              date: formattedMonth,
              month: formattedMonth,
              primaryValue: monthData.netWorth,
              metrics,
            };
          }
        }
        break;
      }
    }
    setPinnedData(pinData);
  };

  // Clear pinned data handler
  const handleClearPinned = () => {
    setPinnedData(null);
  };

  // Helper to extract hovered data from chart payload
  const extractHoveredData = (
    payload: Array<{ payload?: Record<string, unknown> }> | undefined,
    chartType: ChartType
  ): HoveredData | null => {
    if (!payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;
    if (!dataPoint) return null;

    const month = (dataPoint.month as string) || "";
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
      case "savings-rate": {
        const savingsRate = dataPoint["Savings Rate"] as number;
        const totalIncome = dataPoint["Total Income"] as number;
        const totalExpenditure = dataPoint["Total Expenditure"] as number;
        const savingsFromIncome = dataPoint["Savings from Income"] as number;
        metrics["Savings Rate"] = savingsRate || 0;
        metrics["Total Income"] = totalIncome || 0;
        metrics["Total Expenditure"] = totalExpenditure || 0;
        metrics["Savings from Income"] = savingsFromIncome || 0;
        primaryValue = savingsRate || 0;
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
        // Use Math.abs to handle both positive and negative balance conventions
        const liabilities =
          latest.accountBalances
            ?.filter((acc) => acc.isLiability)
            .reduce((sum, acc) => sum + Math.abs(acc.balance), 0) || 0;
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
            "Total Expenditure": latest["Total Expenditure"] || 0,
            "Savings from Income": latest["Savings from Income"] || 0,
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
  }, [
    chartData,
    chartType,
    allocationOptions,
    projectionDataFromContext,
    totalOptions?.viewType,
  ]);

  // Custom tooltip that updates header instead of showing tooltip
  const HeaderUpdateTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: Record<string, unknown> }>;
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

  // Calculate cumulative wealth source data (must be at top level for hooks)
  const wealthSourceData = useMemo(() => {
    if (chartType !== "by-wealth-source") {
      return null;
    }

    const isCumulative = byWealthSourceOptions?.viewType === "cumulative";
    if (!isCumulative) {
      return chartData.sourceData;
    }

    // Calculate cumulative values
    const sourceKeys = [
      "Savings from Income",
      "Interest Earned",
      "Capital Gains",
    ] as const;

    const cumulativeData = [];
    const runningTotals: Record<string, number> = {
      "Savings from Income": 0,
      "Interest Earned": 0,
      "Capital Gains": 0,
    };

    // Sort data chronologically (oldest first)
    const sortedData = [...chartData.sourceData].sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });

    for (const item of sortedData) {
      const cumulativeItem: typeof item = {
        ...item,
      };

      const monthlyValues: Record<string, number> = {};
      for (const source of sourceKeys) {
        const monthlyValue = (item[source] as number) || 0;
        monthlyValues[source] = monthlyValue;
        runningTotals[source] += monthlyValue;
        cumulativeItem[source] = runningTotals[source];
      }
      cumulativeData.push(cumulativeItem);
    }

    return cumulativeData;
  }, [chartType, chartData.sourceData, byWealthSourceOptions?.viewType]);

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
            color: getUniqueColor(index),
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
              <AreaChart
                data={totalChartData}
                margin={margins}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    handlePinToggle(data.activePayload[0].payload.month);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isTotalPercentage
                      ? formatPercentage(value) // Never mask percentages
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
                      offset: 5,
                      fill: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                )}
                {totalAccountTypesArray.map((type, index) => {
                  const isHovered = hoveredCardName === type;
                  const hasHover = hoveredCardName !== null;
                  const isHidden = hiddenCards.has(type);
                  const opacity = isHidden
                    ? 0
                    : hasHover
                    ? isHovered
                      ? 0.9
                      : 0.2
                    : 0.6;

                  return (
                    <Area
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stackId="total"
                      stroke={isHidden ? "transparent" : getUniqueColor(index)}
                      fill={getUniqueColor(index)}
                      fillOpacity={opacity}
                      isAnimationActive={false}
                      onClick={(data) => {
                        if ("payload" in data) {
                          const payload = data.payload as {
                            month: string;
                            monthKey: string;
                            [key: string]: string | number;
                          };
                          handlePinToggle(payload.month);
                        }
                      }}
                      style={{ cursor: isHidden ? "default" : "pointer" }}
                    />
                  );
                })}
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

          // Use Math.abs to handle both positive and negative balance conventions
          const liabilities = item.accountBalances
            .filter((acc) => acc.isLiability)
            .reduce((sum, acc) => sum + Math.abs(acc.balance), 0);

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
                color: CHART_GREEN,
              },
              Liabilities: {
                label: "Liabilities",
                color: CHART_RED,
              },
              "Net Worth": {
                label: "Net Worth",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={assetsVsLiabilitiesData}
                margin={margins}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    handlePinToggle(data.activePayload[0].payload.month);
                  }
                }}
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
                      offset: 5,
                      fill: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="Assets"
                  stackId="1"
                  stroke={
                    hiddenCards.has("Assets") ? "transparent" : CHART_GREEN
                  }
                  fill={CHART_GREEN}
                  fillOpacity={
                    hiddenCards.has("Assets")
                      ? 0
                      : hoveredCardName !== null
                      ? hoveredCardName === "Assets"
                        ? 0.9
                        : 0.2
                      : 0.6
                  }
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="Liabilities"
                  stackId="1"
                  stroke={
                    hiddenCards.has("Liabilities") ? "transparent" : CHART_RED
                  }
                  fill={CHART_RED}
                  fillOpacity={
                    hiddenCards.has("Liabilities")
                      ? 0
                      : hoveredCardName !== null
                      ? hoveredCardName === "Liabilities"
                        ? 0.9
                        : 0.2
                      : 0.6
                  }
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="Net Worth"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        Assets: number;
                        Liabilities: number;
                        "Net Worth": number;
                      };
                      handlePinToggle(payload.month);
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
            "Growth Rate": Math.floor(growthRate),
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
              <BarChart
                data={growthRateData}
                margin={margins}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    handlePinToggle(data.activePayload[0].payload.month);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) => formatPercentage(value)}
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
                    fill: "hsl(var(--foreground))",
                    fillOpacity: 0.1,
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
                      offset: 5,
                      fill: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                )}
                <Bar
                  dataKey="Growth Rate"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        "Growth Rate": number;
                        netWorth: number;
                      };
                      handlePinToggle(payload.month);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {growthRateData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry["Growth Rate"] >= 0 ? CHART_GREEN : CHART_RED}
                    />
                  ))}
                </Bar>
              </BarChart>
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
                  color: getUniqueColor(index),
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
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    handlePinToggle(data.activePayload[0].payload.month);
                  }
                }}
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
                      offset: 5,
                      fill: "var(--foreground)",
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
                        fill={getUniqueColor(index)}
                        maxBarSize={accountBarSize}
                        stackId={stackId}
                        onClick={(data) => handlePinToggle(data.month)}
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

        // Use pre-calculated wealth source data (from top-level useMemo)
        const dataToUse = wealthSourceData || chartData.sourceData;

        return (
          <ChartContainer
            config={sourceKeys.reduce(
              (config, source, index) => ({
                ...config,
                [source]: {
                  label: source,
                  color: getUniqueColor(index),
                },
              }),
              {}
            )}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dataToUse}
                margin={margins}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    handlePinToggle(data.activePayload[0].payload.month);
                  }
                }}
              >
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
                        stopColor={getUniqueColor(index)}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={getUniqueColor(index)}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
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
                      offset: 5,
                      fill: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                )}
                {sourceKeys.map((source, index) => {
                  const hasData = dataToUse.some(
                    (monthData) => (monthData[source] || 0) !== 0
                  );
                  if (hasData) {
                    const isHovered = hoveredCardName === source;
                    const hasHover = hoveredCardName !== null;
                    const isHidden = hiddenCards.has(source);
                    const opacity = isHidden
                      ? 0
                      : hasHover
                      ? isHovered
                        ? 0.9
                        : 0.2
                      : 0.6;

                    return (
                      <Area
                        key={source}
                        type="monotone"
                        dataKey={source}
                        stroke={
                          isHidden ? "transparent" : getUniqueColor(index)
                        }
                        fill={`url(#${source.replace(/\s+/g, "")}Gradient)`}
                        fillOpacity={opacity}
                        strokeWidth={2}
                        isAnimationActive={false}
                        onClick={(data) => {
                          if ("payload" in data) {
                            const payload = data.payload as {
                              month: string;
                              [key: string]: string | number | undefined;
                            };
                            if (payload.month) {
                              handlePinToggle(payload.month);
                            }
                          }
                        }}
                        style={{ cursor: isHidden ? "default" : "pointer" }}
                      />
                    );
                  }
                  return null;
                })}
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
            fill: getUniqueColor(index),
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
              totalAllocation > 0 ? (data.value / totalAllocation) * 100 : 0;
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
                  <span className="text-muted-foreground">
                    ({formatPercentage(percentage)})
                  </span>
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
              {formatPercentage(percent * 100)}
            </text>
          );
        };

        // Calculate responsive sizes based on screen width
        const isMobile = width && width < 640;
        const isTablet = width && width >= 640 && width < 1024;
        const outerRadius = isMobile ? 90 : isTablet ? 120 : 140;
        const innerRadius = isMobile ? 45 : isTablet ? 60 : 70;
        const cxPosition = isMobile ? "45%" : isTablet ? "38%" : "35%";
        const chartHeight = isMobile ? "280px" : isTablet ? "360px" : "450px";

        return (
          <div className="w-full">
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
              className="w-full"
              style={{ height: chartHeight }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx={cxPosition}
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={outerRadius}
                    innerRadius={innerRadius}
                    fill="#8884d8"
                    dataKey="value"
                    isAnimationActive={false}
                    onClick={() => {
                      handlePinToggle(selectedMonthData.month);
                    }}
                  >
                    {allocationData.map((entry, index) => {
                      const isHovered = hoveredCardName === entry.name;
                      const hasHover = hoveredCardName !== null;
                      const isHidden = hiddenCards.has(entry.name);
                      const opacity = isHidden
                        ? 0.1
                        : hasHover
                        ? isHovered
                          ? 1
                          : 0.3
                        : 1;

                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                          fillOpacity={opacity}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    verticalAlign="middle"
                    align={isMobile ? "right" : "right"}
                    layout="vertical"
                    wrapperStyle={isMobile ? { paddingLeft: "10px" } : {}}
                    iconSize={isMobile ? 12 : 14}
                    formatter={(value, entry) => {
                      const entryValue = (entry.payload as { value?: number })
                        ?.value;
                      const percentage =
                        totalAllocation > 0 && entryValue
                          ? (entryValue / totalAllocation) * 100
                          : 0;
                      return `${value} (${formatPercentage(percentage)})`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        );

      case "waterfall":
        // Process data for waterfall chart showing month-to-month net worth changes
        // For each month, show: Starting Balance (from previous month) -> +Savings -> +Interest -> +Capital Gains
        // Data is already in chronological order (oldest to newest) from the source
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

        // Calculate min/max for auto-scaling y-axis (not starting from zero)
        // For stacked bars, we need to account for all possible bar positions
        const allWaterfallValues: number[] = [];
        waterfallData.forEach((point) => {
          // Include starting balance (base of bar)
          allWaterfallValues.push(point["Starting Balance"]);
          // Include ending balance (top of stacked bar)
          allWaterfallValues.push(point["Ending Balance"]);
        });

        // Calculate domain for y-axis - use explicit array to avoid default zero-starting behavior
        let waterfallDomain: [number, number] = [0, 100];

        if (allWaterfallValues.length > 0) {
          const min = Math.min(...allWaterfallValues);
          const max = Math.max(...allWaterfallValues);

          // Use very minimal padding - just enough to prevent clipping (0.5% of range)
          const range = max - min;
          const padding = range > 0 ? range * 0.005 : 0;

          waterfallDomain = [min - padding, max + padding];
        }

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
              <BarChart
                data={waterfallData}
                margin={margins}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    handlePinToggle(data.activePayload[0].payload.month);
                  }
                }}
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
                  domain={waterfallDomain}
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
                      offset: 5,
                      fill: "var(--foreground)",
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
                  fill={
                    hiddenCards.has("Savings from Income")
                      ? "transparent"
                      : COLORS[0]
                  }
                  fillOpacity={
                    hiddenCards.has("Savings from Income")
                      ? 0
                      : hoveredCardName !== null
                      ? hoveredCardName === "Savings from Income"
                        ? 1
                        : 0.3
                      : 1
                  }
                  stackId="waterfall"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handlePinToggle(payload.month);
                      }
                    }
                  }}
                  style={{
                    cursor: hiddenCards.has("Savings from Income")
                      ? "default"
                      : "pointer",
                  }}
                />
                {/* Interest Earned */}
                <Bar
                  dataKey="Interest Earned"
                  fill={
                    hiddenCards.has("Interest Earned")
                      ? "transparent"
                      : COLORS[1]
                  }
                  fillOpacity={
                    hiddenCards.has("Interest Earned")
                      ? 0
                      : hoveredCardName !== null
                      ? hoveredCardName === "Interest Earned"
                        ? 1
                        : 0.3
                      : 1
                  }
                  stackId="waterfall"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handlePinToggle(payload.month);
                      }
                    }
                  }}
                  style={{
                    cursor: hiddenCards.has("Interest Earned")
                      ? "default"
                      : "pointer",
                  }}
                />
                {/* Capital Gains - can be negative */}
                <Bar
                  dataKey="Capital Gains"
                  fill={
                    hiddenCards.has("Capital Gains") ? "transparent" : COLORS[2]
                  }
                  fillOpacity={
                    hiddenCards.has("Capital Gains")
                      ? 0
                      : hoveredCardName !== null
                      ? hoveredCardName === "Capital Gains"
                        ? 1
                        : 0.3
                      : 1
                  }
                  stackId="waterfall"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        [key: string]: string | number | undefined;
                      };
                      if (payload.month) {
                        handlePinToggle(payload.month);
                      }
                    }
                  }}
                  style={{
                    cursor: hiddenCards.has("Capital Gains")
                      ? "default"
                      : "pointer",
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        );

      case "savings-rate":
        // Create chart data with Savings Rate, Total Income, Total Expenditure, and Savings from Income
        // Filter out any invalid data points
        const savingsRateData = chartData.sourceData
          .filter((item) => item && item.month && item.monthKey)
          .map((item) => ({
            month: item.month,
            monthKey: item.monthKey,
            "Savings Rate":
              typeof item["Savings Rate"] === "number"
                ? item["Savings Rate"]
                : 0,
            "Total Income":
              typeof item["Total Income"] === "number"
                ? item["Total Income"]
                : 0,
            "Total Expenditure":
              typeof item["Total Expenditure"] === "number"
                ? item["Total Expenditure"]
                : 0,
            "Savings from Income":
              typeof item["Savings from Income"] === "number"
                ? item["Savings from Income"]
                : 0,
          }));

        if (!savingsRateData || savingsRateData.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center h-[300px] sm:h-[400px] text-center">
              <p className="text-muted-foreground mb-2">
                No savings rate data available
              </p>
              <p className="text-sm text-muted-foreground">
                Add income and expenditure data to see your savings rate
              </p>
            </div>
          );
        }

        return (
          <ChartContainer
            config={{
              "Savings Rate": {
                label: "Savings Rate (%)",
                color: CHART_GREEN,
              },
              "Total Income": {
                label: "Total Income",
                color: COLORS[0],
              },
              "Total Expenditure": {
                label: "Total Expenditure",
                color: CHART_RED,
              },
              "Savings from Income": {
                label: "Savings from Income",
                color: COLORS[1],
              },
            }}
            className="h-[250px] sm:h-[350px] md:h-[400px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={savingsRateData}
                margin={margins}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    handlePinToggle(data.activePayload[0].payload.month);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  yAxisId="left"
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
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  hide={true}
                  tickFormatter={(value) =>
                    isMasked ? "•••" : `${Math.round(value)}%`
                  }
                  fontSize={fontSize}
                  width={width && width < 640 ? 50 : 60}
                  tick={{ fontSize }}
                  domain={[0, 100]}
                  allowDataOverflow={true}
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
                    yAxisId="left"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: hoveredData.date || hoveredData.month,
                      position: "top",
                      offset: 5,
                      fill: "var(--foreground)",
                      fontSize: 10,
                    }}
                  />
                )}
                {/* Stacked Bars: Expenditure (bottom) + Savings (top) = Total Income */}
                <Bar
                  dataKey="Total Expenditure"
                  yAxisId="left"
                  fill={
                    hiddenCards.has("Total Expenditure")
                      ? "transparent"
                      : CHART_RED
                  }
                  fillOpacity={
                    hiddenCards.has("Total Expenditure")
                      ? 0
                      : hoveredCardName !== null
                      ? hoveredCardName === "Total Expenditure" ||
                        hoveredCardName === "Total Income"
                        ? 1
                        : 0.3
                      : 1
                  }
                  stackId="income-breakdown"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        monthKey: string;
                      };
                      handlePinToggle(payload.month);
                    }
                  }}
                  style={{
                    cursor: hiddenCards.has("Total Expenditure")
                      ? "default"
                      : "pointer",
                  }}
                />
                <Bar
                  dataKey="Savings from Income"
                  yAxisId="left"
                  fill={
                    hiddenCards.has("Savings from Income")
                      ? "transparent"
                      : COLORS[1]
                  }
                  fillOpacity={
                    hiddenCards.has("Savings from Income")
                      ? 0
                      : hoveredCardName !== null
                      ? hoveredCardName === "Savings from Income" ||
                        hoveredCardName === "Total Income"
                        ? 1
                        : 0.3
                      : 1
                  }
                  stackId="income-breakdown"
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        monthKey: string;
                      };
                      handlePinToggle(payload.month);
                    }
                  }}
                  style={{
                    cursor: hiddenCards.has("Savings from Income")
                      ? "default"
                      : "pointer",
                  }}
                />
                {/* Savings Rate Line */}
                <Line
                  type="monotone"
                  dataKey="Savings Rate"
                  yAxisId="right"
                  stroke="#9333EA"
                  strokeWidth={3}
                  strokeOpacity={hoveredCardName !== null ? 0.3 : 1}
                  dot={{ fill: "#9333EA", r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                  onClick={(data) => {
                    if ("payload" in data) {
                      const payload = data.payload as {
                        month: string;
                        monthKey: string;
                      };
                      handlePinToggle(payload.month);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              </ComposedChart>
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
            color: getUniqueColor(index),
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
              <AreaChart
                data={projectionChartData}
                margin={margins}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.monthKey) {
                    handlePinToggle(data.activePayload[0].payload.monthKey);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" hide={true} />
                <YAxis
                  hide={true}
                  tickFormatter={(value) =>
                    isPercentage
                      ? formatPercentage(value) // Never mask percentages
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
                      offset: 5,
                      fill: "var(--foreground)",
                      fontSize: 12,
                    }}
                  />
                )}
                {projectionAccountTypesArray.map((type, index) => {
                  const isHovered = hoveredCardName === type;
                  const hasHover = hoveredCardName !== null;
                  const isHidden = hiddenCards.has(type);
                  const opacity = isHidden
                    ? 0
                    : hasHover
                    ? isHovered
                      ? 0.9
                      : 0.2
                    : 0.6;

                  return (
                    <Area
                      key={type}
                      type="monotone"
                      dataKey={type}
                      stackId="projection"
                      stroke={isHidden ? "transparent" : getUniqueColor(index)}
                      fill={getUniqueColor(index)}
                      fillOpacity={opacity}
                      isAnimationActive={false}
                      onClick={(data) => {
                        if ("payload" in data) {
                          const payload = data.payload as {
                            month: string;
                            monthKey: string;
                            [key: string]: string | number;
                          };
                          handlePinToggle(payload.monthKey);
                        }
                      }}
                      style={{ cursor: isHidden ? "default" : "pointer" }}
                    />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        );
    }
  };

  // Early return for loading state - must be after all hooks
  // Shows full section skeleton including header, cards, chart, and period selector
  if (isLoading) {
    return <ChartSectionSkeleton />;
  }

  return (
    <>
      {/* Chart Header */}
      <ChartHeader
        chartType={chartType}
        hoveredData={hoveredData}
        pinnedData={pinnedData}
        onClearPinned={handleClearPinned}
        latestData={latestData}
        chartCurrency={chartCurrency}
        totalOptions={totalOptions}
        projectionOptions={projectionOptions}
        headerControls={headerControls}
        hoveredCardName={hoveredCardName}
        onCardHover={setHoveredCardName}
        hiddenCards={hiddenCards}
        onToggleHidden={onToggleHidden}
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
            isLoading={false}
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
