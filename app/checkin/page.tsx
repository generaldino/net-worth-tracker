import { getCheckinData } from "@/app/actions/checkin";
import { CheckinFlow } from "@/components/checkin/checkin-flow";

export const dynamic = "force-dynamic";

interface CheckinPageProps {
  searchParams: Promise<{ month?: string }>;
}

function previousMonthKey(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CheckinPage({ searchParams }: CheckinPageProps) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : previousMonthKey();

  const data = await getCheckinData(month);

  return <CheckinFlow data={data} />;
}
