import { getDataHealthReport } from "@/app/actions/data-health";
import { DataHealthView } from "@/components/data-health/data-health-view";

export const dynamic = "force-dynamic";

export default async function DataHealthPage() {
  const report = await getDataHealthReport();
  return (
    <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
      <div className="w-full max-w-5xl mx-auto py-4 px-4 sm:px-6">
        <DataHealthView report={report} />
      </div>
    </div>
  );
}
