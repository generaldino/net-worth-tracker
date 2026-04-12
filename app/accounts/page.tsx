import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { DashboardProviders } from "@/components/dashboard-providers";
import { DashboardContent } from "@/components/dashboard-content";
import { NewAccountsSectionWrapper } from "@/components/new-accounts-section-wrapper";
import { AccountsSkeleton } from "@/components/skeletons/accounts-skeleton";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <DashboardProviders session={session}>
      <DashboardContent>
        <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
          <div className="w-full max-w-full py-4 px-4 sm:px-6">
            <Suspense fallback={<AccountsSkeleton />}>
              <NewAccountsSectionWrapper />
            </Suspense>
          </div>
        </div>
      </DashboardContent>
    </DashboardProviders>
  );
}
