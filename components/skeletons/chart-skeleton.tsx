import { Skeleton } from "@/components/ui/skeleton";

/**
 * Full chart section skeleton that includes:
 * - Header with primary metric (NET WORTH)
 * - Breakdown cards
 * - Chart controls (chart type selector + options)
 * - Chart area
 * - Period selector
 */
export function ChartSectionSkeleton() {
  return (
    <div className="w-full">
      <div className="pt-0">
        {/* Header section - matches ChartHeader layout */}
        <div className="mb-4 w-full">
          {/* Primary metrics */}
          <div className="space-y-3">
            {/* Main metric label and value */}
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-9 sm:h-10 w-40" />
            </div>

            {/* Breakdown cards section */}
            <div className="w-full min-h-[120px]">
              <Skeleton className="h-3 w-32 mb-2" />
              {/* Horizontal scrollable cards */}
              <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[140px] sm:w-[160px] p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Skeleton className="h-3 w-3 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-20 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Header controls - chart type selector and options */}
          <div className="w-full mt-3 min-h-[40px] overflow-hidden">
            <div className="flex gap-2">
              {/* Chart type selector skeleton */}
              <Skeleton className="h-9 w-[200px] rounded-md" />
              {/* View options skeleton */}
              <Skeleton className="h-9 w-[180px] rounded-md" />
            </div>
          </div>
        </div>

        {/* Chart area skeleton */}
        <div className="w-full">
          <Skeleton className="h-[250px] sm:h-[350px] md:h-[400px] w-full rounded-md" />
        </div>

        {/* Period selector skeleton */}
        <div className="mt-4 flex justify-center">
          <div className="flex gap-1">
            {["1M", "3M", "6M", "1Y", "YTD", "ALL"].map((period) => (
              <Skeleton key={period} className="h-8 w-12 rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @deprecated Use ChartSectionSkeleton instead for full section skeleton
 * Simple chart skeleton for backwards compatibility
 */
export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      {/* Chart type selector skeleton */}
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      {/* Chart area skeleton */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-12 rounded-md" />
            ))}
          </div>
        </div>

        {/* Main chart area */}
        <Skeleton className="h-[300px] sm:h-[400px] w-full rounded-md" />

        {/* Legend area */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
