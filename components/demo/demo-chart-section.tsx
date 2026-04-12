"use client";

import { DashboardGrid } from "@/components/charts/dashboard-grid";

// ChartDataProvider is supplied by the parent:
//   - app/demo/page.tsx wraps itself for the public demo route
//   - DashboardContent swaps in demo data via useChartDataOverride when
//     demo mode is toggled from the sidebar on the real dashboard
export function DemoChartSection() {
  return <DashboardGrid />;
}
