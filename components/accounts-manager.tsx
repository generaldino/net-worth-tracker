import { Suspense } from "react";
import { ChartSection } from "@/components/charts/chart-section";
import { NewAccountsSectionWrapper } from "@/components/new-accounts-section-wrapper";
import { ChartSkeleton } from "@/components/skeletons/chart-skeleton";
import { AccountsSkeleton } from "@/components/skeletons/accounts-skeleton";

export async function AccountsManager() {
  // Data fetching for net worth and financial metrics is now done at the page level
  // and passed to NetWorthProvider as initial props (no more setter pattern!)
  
  return (
    <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
      <div className="w-full max-w-full py-4 px-4 sm:px-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Suspense boundary for charts - streams independently */}
          <Suspense fallback={<ChartSkeleton />}>
            <ChartSection />
          </Suspense>
          
          {/* Suspense boundary for accounts - streams independently */}
          <Suspense fallback={<AccountsSkeleton />}>
            <NewAccountsSectionWrapper />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
