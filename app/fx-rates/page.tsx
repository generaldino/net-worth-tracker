import { getExchangeRateRows } from "@/app/actions/fx-rates";
import { FxRatesView } from "@/components/fx-rates/fx-rates-view";

export const dynamic = "force-dynamic";

export default async function FxRatesPage() {
  const rows = await getExchangeRateRows();
  return (
    <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
      <div className="w-full max-w-5xl mx-auto py-4 px-4 sm:px-6">
        <FxRatesView rows={rows} />
      </div>
    </div>
  );
}
