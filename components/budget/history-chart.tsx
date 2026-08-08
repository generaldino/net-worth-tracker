"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_GREEN, CHART_RED } from "@/components/charts/chart-shared";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { BudgetHistoryPoint } from "@/app/actions/budget";

interface HistoryChartProps {
  history: BudgetHistoryPoint[];
}

function shortLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

/**
 * Twelve months of income vs spending, in GBP. Lean by design — the full
 * chart machinery lives on the home screen; this answers one question:
 * is the gap between the bars (your savings) holding up?
 */
export function HistoryChart({ history }: HistoryChartProps) {
  const points = history.map((h) => ({
    month: shortLabel(h.month),
    Income: Math.round(h.incomeGbp),
    Spending: Math.round(h.spendGbp),
  }));

  const hasData = history.some((h) => h.incomeGbp > 0 || h.spendGbp > 0);
  if (!hasData) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Last 12 months</h2>
      <div className="rounded-lg border bg-card p-3">
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
              <XAxis
                dataKey="month"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value: number | string) =>
                  formatCurrencyAmount(Number(value), "GBP")
                }
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="Income" fill={CHART_GREEN} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Spending" fill={CHART_RED} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          The gap between the bars is what you kept. Figures in GBP.
        </p>
      </div>
    </section>
  );
}
