"use client";

import * as React from "react";
import { useInitialChartData } from "@/contexts/chart-data-context";
import { useDemo } from "@/contexts/demo-context";
import { useAccountFilters } from "@/hooks/use-account-filters";
import { buildAccountFacets } from "@/components/filters/account-facets";
import { AccountFiltersPopover } from "@/components/filters/account-filters-popover";
import { ActiveFilterChips } from "@/components/filters/active-filter-chips";

// Facet options come from the *initial* (unfiltered) server dataset, so the
// list of choices doesn't shrink as you filter.
function useDashboardFacets() {
  const initialData = useInitialChartData();
  return React.useMemo(
    () => buildAccountFacets(initialData?.accounts ?? []),
    [initialData]
  );
}

export function DashboardAccountFilters({
  isPending = false,
  align = "end",
}: {
  isPending?: boolean;
  align?: "start" | "end";
}) {
  const initialData = useInitialChartData();
  const { isDemoMode } = useDemo();
  const { filters, activeCount, toggle, clearFacet, clearAll } =
    useAccountFilters();
  const facets = useDashboardFacets();

  if (isDemoMode || !initialData || initialData.accounts.length === 0)
    return null;

  return (
    <AccountFiltersPopover
      facets={facets}
      filters={filters}
      activeCount={activeCount}
      onToggle={toggle}
      onClearFacet={clearFacet}
      onClearAll={clearAll}
      align={align}
      isPending={isPending}
    />
  );
}

export function DashboardFilterChips({ className }: { className?: string }) {
  const { isDemoMode } = useDemo();
  const { filters, toggle, clearAll } = useAccountFilters();
  const facets = useDashboardFacets();

  if (isDemoMode) return null;

  return (
    <ActiveFilterChips
      facets={facets}
      filters={filters}
      onToggle={toggle}
      onClearAll={clearAll}
      className={className}
    />
  );
}
