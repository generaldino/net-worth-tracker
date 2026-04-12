import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardContent } from "@/components/dashboard-content";
import { DashboardProviders } from "@/components/dashboard-providers";
import { DashboardGridSection } from "@/components/charts/dashboard-grid-section";
import { ChartSectionSkeleton } from "@/components/skeletons/chart-skeleton";
import { hasAnyData } from "@/lib/actions";

interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    image?: string | null;
    isAdmin?: boolean;
  };
  expires: string;
}

interface DashboardShellProps {
  session: Session;
}

function DashboardEmptyState() {
  return (
    <div className="min-h-[calc(100svh-56px)] bg-background flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Track your net worth</h2>
        <p className="text-muted-foreground">
          Add your first account to start seeing charts on this dashboard.
        </p>
        <Button asChild size="lg">
          <Link href="/accounts">Add your first account</Link>
        </Button>
      </div>
    </div>
  );
}

function DashboardMain() {
  return (
    <DashboardContent>
      <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
        <div className="w-full max-w-full py-4 px-4 sm:px-6">
          <Suspense fallback={<ChartSectionSkeleton />}>
            <DashboardGridSection />
          </Suspense>
        </div>
      </div>
    </DashboardContent>
  );
}

export async function DashboardShell({ session }: DashboardShellProps) {
  const userHasData = await hasAnyData();

  return (
    <DashboardProviders session={session}>
      {userHasData ? <DashboardMain /> : <DashboardEmptyState />}
    </DashboardProviders>
  );
}
