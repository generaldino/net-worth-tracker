import type React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardProviders } from "@/components/dashboard-providers";

export default async function FxRatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }
  return <DashboardProviders session={session}>{children}</DashboardProviders>;
}
