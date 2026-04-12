"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChartData } from "@/components/charts/types";
import type { TimePeriod } from "@/lib/types";

// Re-export color constants so chart components have a single import point.
export {
  COLORS,
  CHART_GREEN,
  CHART_RED,
  getAccountTypeColor,
  getUniqueColor,
  isAccountType,
  ACCOUNT_TYPE_COLORS,
} from "./constants";

// Account type ordering hierarchy for consistent sorting.
export const ACCOUNT_TYPE_ORDER: Record<string, number> = {
  Current: 0,
  Savings: 1,
  Investment: 10,
  Stock: 11,
  Crypto: 12,
  Commodity: 13,
  Stock_options: 14,
  Asset: 15,
  Pension: 20,
  Credit_Card: 30,
  Loan: 31,
};

export function getAccountTypePriority(type: string): number {
  return ACCOUNT_TYPE_ORDER[type] ?? 999;
}

export function sortAccountTypesByHierarchy<
  T extends { name: string; absValue: number }
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const priorityA = getAccountTypePriority(a.name);
    const priorityB = getAccountTypePriority(b.name);
    if (priorityA !== priorityB) return priorityA - priorityB;
    return b.absValue - a.absValue;
  });
}

export function formatAccountTypeName(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Shared hover/pin state for a chart card. Hovering a point updates the header
// readout; clicking pins it until cleared or a new pin replaces it.
export interface HoveredPoint {
  month: string;
  primaryValue?: number;
  metrics?: Record<string, number>;
}

export function useChartHover() {
  const [hovered, setHovered] = useState<HoveredPoint | null>(null);
  const [pinned, setPinned] = useState<HoveredPoint | null>(null);

  const pinPoint = useCallback((point: HoveredPoint | null) => {
    setPinned((prev) => (prev && point && prev.month === point.month ? null : point));
  }, []);

  const clearPinned = useCallback(() => setPinned(null), []);

  return {
    hovered,
    pinned,
    displayed: pinned ?? hovered,
    setHovered,
    pinPoint,
    clearPinned,
  };
}

// Shared responsive chart sizing.
export function getResponsiveChartMargins(width: number | undefined) {
  if (!width) return { top: 30, right: 40, left: 20, bottom: 10 };
  if (width < 640) return { top: 25, right: 30, left: 15, bottom: 10 };
  if (width < 1024) return { top: 30, right: 40, left: 20, bottom: 10 };
  return { top: 30, right: 50, left: 20, bottom: 10 };
}

export function getResponsiveFontSize(width: number | undefined): number {
  if (!width) return 10;
  return width < 640 ? 9 : width < 1024 ? 10 : 11;
}

// Filter full ChartData down to a time period by slicing every series on monthKey.
export function filterChartDataByPeriod(
  data: ChartData,
  period: TimePeriod
): ChartData {
  if (period === "all") return data;

  const allMonths = new Set<string>();
  data.netWorthData.forEach((i) => i.monthKey && allMonths.add(i.monthKey));
  data.accountTypeData.forEach((i) => i.monthKey && allMonths.add(i.monthKey));
  data.sourceData.forEach((i) => i.monthKey && allMonths.add(i.monthKey));

  const sorted = Array.from(allMonths).sort();
  if (sorted.length === 0) return data;

  const latestMonth = sorted[sorted.length - 1];
  const [latestYear, latestMonthNum] = latestMonth.split("-").map(Number);

  const keep = new Set<string>();
  switch (period) {
    case "1M": {
      const from = new Date(latestYear, latestMonthNum - 2, 1);
      sorted.forEach((m) => {
        if (new Date(m + "-01") >= from) keep.add(m);
      });
      break;
    }
    case "3M": {
      const from = new Date(latestYear, latestMonthNum - 4, 1);
      sorted.forEach((m) => {
        if (new Date(m + "-01") >= from) keep.add(m);
      });
      break;
    }
    case "6M": {
      const from = new Date(latestYear, latestMonthNum - 7, 1);
      sorted.forEach((m) => {
        if (new Date(m + "-01") >= from) keep.add(m);
      });
      break;
    }
    case "1Y": {
      const from = new Date(latestYear, latestMonthNum - 13, 1);
      sorted.forEach((m) => {
        if (new Date(m + "-01") >= from) keep.add(m);
      });
      break;
    }
    case "YTD": {
      sorted.forEach((m) => {
        if (m.startsWith(latestYear.toString())) keep.add(m);
      });
      break;
    }
  }

  return {
    ...data,
    netWorthData: data.netWorthData.filter((i) =>
      i.monthKey ? keep.has(i.monthKey) : true
    ),
    accountData: data.accountData.filter((i) =>
      i.monthKey ? keep.has(i.monthKey) : true
    ),
    accountTypeData: data.accountTypeData.filter((i) =>
      i.monthKey ? keep.has(i.monthKey) : true
    ),
    categoryData: data.categoryData.filter((i) =>
      i.monthKey ? keep.has(i.monthKey) : true
    ),
    sourceData: data.sourceData.filter((i) =>
      i.monthKey ? keep.has(i.monthKey) : true
    ),
  };
}

// Convert a hex color and an opacity (0-1) into an rgba string so we can use
// solid colors inside a single-color fill gradient for Recharts.
export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Build the ordered, deduped list of asset and liability keys in the data,
// used for stacked charts.
export function useAccountTypeKeys(
  data: ChartData["accountTypeData"]
): string[] {
  return useMemo(() => {
    const keys = new Set<string>();
    data.forEach((point) => {
      Object.keys(point).forEach((key) => {
        if (
          key !== "month" &&
          key !== "monthKey" &&
          !key.endsWith("_currencies")
        ) {
          keys.add(key);
        }
      });
    });
    return Array.from(keys).sort((a, b) => {
      return getAccountTypePriority(a) - getAccountTypePriority(b);
    });
  }, [data]);
}

