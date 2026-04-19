import type React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardProviders } from "@/components/dashboard-providers";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DataHealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/");
  }
  return (
    <DashboardProviders session={session}>
      <DashboardContent>{children}</DashboardContent>
    </DashboardProviders>
  );
}
