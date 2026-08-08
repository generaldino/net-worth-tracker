import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  DashboardProviders,
  ChartDataLoader,
} from "@/components/dashboard-providers";
import { DashboardGrid } from "@/components/charts/dashboard-grid";
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
    <div className="flex min-h-[calc(100svh-56px)] items-center justify-center bg-background px-4">
      <div className="max-w-md space-y-4 text-center">
        <h2 className="text-2xl font-bold sm:text-3xl">Track your net worth</h2>
        <p className="text-muted-foreground">
          Add your accounts once, then a five-minute check-in each month keeps
          everything up to date.
        </p>
        <Button asChild size="lg">
          <Link href="/accounts">Add your first account</Link>
        </Button>
      </div>
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="w-full max-w-full px-4 py-4 sm:px-6">
      <div className="grid grid-cols-1 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[240px] animate-pulse rounded-lg bg-muted/30 sm:h-[280px]"
          />
        ))}
      </div>
    </div>
  );
}

export async function DashboardShell({ session }: DashboardShellProps) {
  const userHasData = await hasAnyData();

  return (
    <DashboardProviders session={session}>
      {userHasData ? (
        <div className="min-h-[calc(100svh-56px)] w-full max-w-full overflow-x-hidden bg-background">
          <Suspense fallback={<ChartsSkeleton />}>
            <ChartDataLoader>
              <div className="w-full max-w-full px-4 py-4 sm:px-6">
                <DashboardGrid />
              </div>
            </ChartDataLoader>
          </Suspense>
        </div>
      ) : (
        <DashboardEmptyState />
      )}
    </DashboardProviders>
  );
}
