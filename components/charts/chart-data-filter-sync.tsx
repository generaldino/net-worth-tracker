"use client";

import * as React from "react";
import { toast } from "sonner";
import { getChartData } from "@/lib/actions";
import {
  useInitialChartData,
  useChartDataOverride,
} from "@/contexts/chart-data-context";
import { useDemo } from "@/contexts/demo-context";
import { useAccountFilters } from "@/hooks/use-account-filters";

const DEBOUNCE_MS = 300;

interface ChartDataFilterSyncProps {
  onPendingChange?: (isPending: boolean) => void;
}

// Keeps the chart dataset in step with the account filters in the URL.
// Deliberately headless and mounted independently of the filter UI, so the
// charts and navbar KPIs stay filtered on pages that render the filter
// control somewhere else (e.g. the accounts toolbar).
//
// The period is *not* passed to the server: the full dataset is fetched once
// and narrowed client-side by `filterChartDataByPeriod`, so period changes
// cost no round-trip.
export function ChartDataFilterSync({
  onPendingChange,
}: ChartDataFilterSyncProps) {
  const initialData = useInitialChartData();
  const override = useChartDataOverride();
  const { isDemoMode } = useDemo();
  const { filters, activeCount, setFacet } = useAccountFilters();
  const requestIdRef = React.useRef(0);

  // Accounts deleted since the URL was shared would otherwise filter the
  // charts down to nothing with no way to tell why.
  React.useEffect(() => {
    if (!initialData || isDemoMode || filters.accounts.length === 0) return;
    const known = new Set(initialData.accounts.map((a) => a.id));
    const pruned = filters.accounts.filter((id) => known.has(id));
    if (pruned.length !== filters.accounts.length) {
      setFacet("accounts", pruned);
    }
  }, [initialData, isDemoMode, filters.accounts, setFacet]);

  React.useEffect(() => {
    // Demo mode owns the dataset while it's on (see DashboardContent).
    if (!initialData || isDemoMode) return;

    if (activeCount === 0) {
      requestIdRef.current += 1;
      override(null);
      onPendingChange?.(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    onPendingChange?.(true);

    const timer = setTimeout(async () => {
      try {
        const next = await getChartData(
          "all",
          "all",
          filters.accounts,
          filters.types,
          filters.categories,
          filters.owners,
          filters.currencies
        );
        // A newer toggle already fired — drop this response so rapid
        // clicking can't land results out of order.
        if (requestId !== requestIdRef.current) return;
        override(next);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error("Failed to refetch filtered chart data", err);
        toast.error("Couldn't apply filters", {
          description: "The charts are still showing the previous selection.",
        });
      } finally {
        if (requestId === requestIdRef.current) onPendingChange?.(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [
    initialData,
    isDemoMode,
    activeCount,
    filters,
    override,
    onPendingChange,
  ]);

  return null;
}
