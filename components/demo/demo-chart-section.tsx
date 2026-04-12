"use client";

import { useMemo } from "react";
import { DashboardGrid } from "@/components/charts/dashboard-grid";
import { getDemoChartData } from "@/lib/demo-data";

export function DemoChartSection() {
  const initialData = useMemo(() => getDemoChartData(), []);
  return <DashboardGrid initialData={initialData} />;
}
