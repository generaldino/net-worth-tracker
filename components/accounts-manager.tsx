import { ChartSection } from "@/components/charts/chart-section";
import { NewAccountsSectionWrapper } from "@/components/new-accounts-section-wrapper";
import {
  calculateNetWorth,
  getNetWorthBreakdown,
  getFirstEntryNetWorth,
  getFinancialMetrics,
} from "@/lib/actions";
import { NetWorthDataSetter } from "@/components/net-worth-data-setter";
import { FinancialMetricsSetter } from "@/components/financial-metrics-setter";

export async function AccountsManager() {
  const [
    netWorth,
    netWorthBreakdown,
    firstEntryData,
    financialMetrics,
  ] = await Promise.all([
    calculateNetWorth(),
    getNetWorthBreakdown(),
    getFirstEntryNetWorth(),
    getFinancialMetrics(),
  ]);

  // Calculate percentage increase from first entry
  const percentageIncrease =
    firstEntryData && firstEntryData.netWorth !== 0
      ? ((netWorth - firstEntryData.netWorth) /
          Math.abs(firstEntryData.netWorth)) *
        100
      : null;

  return (
    <>
      <NetWorthDataSetter
        netWorth={netWorth}
        netWorthBreakdown={netWorthBreakdown}
        percentageIncrease={percentageIncrease}
      />
      <FinancialMetricsSetter metrics={financialMetrics} />
      <div className="min-h-screen bg-background overflow-x-hidden pt-46 md:pt-20">
        <div className="w-full py-4 px-4 sm:px-6">
          <div className="space-y-4 sm:space-y-6">
            <ChartSection />

            <NewAccountsSectionWrapper />
          </div>
        </div>
      </div>
    </>
  );
}
