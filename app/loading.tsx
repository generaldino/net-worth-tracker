import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex w-64 border-r bg-card flex-col">
        <div className="p-4 border-b">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Navbar skeleton */}
        <div className="h-14 border-b flex items-center justify-between px-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>

        {/* Dashboard content skeleton */}
        <div className="flex-1 p-4 sm:p-6 space-y-6">
          {/* Net worth card skeleton */}
          <div className="rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-12 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>

          {/* Chart skeleton */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-40" />
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-12 rounded-md" />
                ))}
              </div>
            </div>
            <Skeleton className="h-[300px] w-full rounded-md" />
          </div>

          {/* Accounts skeleton */}
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
