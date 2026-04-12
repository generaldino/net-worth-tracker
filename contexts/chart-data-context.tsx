"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { ChartData } from "@/components/charts/types";

interface ChartDataContextValue {
  data: ChartData;
  // The initial server-fetched dataset — stable reference used by filters
  // that need the unfiltered account list regardless of any override.
  initialData: ChartData;
  // Temporarily override the dataset (e.g. when demo mode is toggled on,
  // or when the dashboard filter refetches with excluded accounts).
  // Pass null to restore the initial (real) data.
  override: (next: ChartData | null) => void;
}

const ChartDataContext = createContext<ChartDataContextValue | null>(null);

// Holds the full chart dataset so the navbar KPIs and the dashboard grid
// read from one source. Stateful so demo mode toggling from the sidebar
// can swap in demo data for both the navbar and the grid at once.
export function ChartDataProvider({
  data,
  children,
}: {
  data: ChartData;
  children: ReactNode;
}) {
  const initialRef = useRef(data);
  const [overrideData, setOverrideData] = useState<ChartData | null>(null);

  const override = useCallback((next: ChartData | null) => {
    setOverrideData(next);
  }, []);

  const value = useMemo<ChartDataContextValue>(
    () => ({
      data: overrideData ?? initialRef.current,
      initialData: initialRef.current,
      override,
    }),
    [overrideData, override]
  );

  return (
    <ChartDataContext.Provider value={value}>
      {children}
    </ChartDataContext.Provider>
  );
}

export function useChartData(): ChartData | null {
  return useContext(ChartDataContext)?.data ?? null;
}

export function useInitialChartData(): ChartData | null {
  return useContext(ChartDataContext)?.initialData ?? null;
}

export function useChartDataOverride(): (next: ChartData | null) => void {
  const ctx = useContext(ChartDataContext);
  if (!ctx) {
    // No-op when there's no provider — demo routes that don't use it
    // just won't respond.
    return () => {};
  }
  return ctx.override;
}
