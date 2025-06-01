import { ChartControls } from "@/components/charts/chart-controls";
import { getChartData } from "@/lib/actions";

export async function ChartSection() {
  const initialData = await getChartData("all");
  console.log("initialData", initialData);

  return (
    <div className="space-y-4">
      <ChartControls initialData={initialData} />
    </div>
  );
}
