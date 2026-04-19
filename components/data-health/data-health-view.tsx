"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WarningSummary } from "./warning-summary";
import { WarningList } from "./warning-list";
import { MonthlyEntryDialog } from "@/components/monthly-entry-dialog";
import type { DataHealthReport } from "@/app/actions/data-health";
import type { DataHealthWarning, WarningCode } from "@/lib/data-health";

interface DataHealthViewProps {
  report: DataHealthReport;
}

type CodeFilter = WarningCode | "ALL";

const FILTER_LABELS: Record<CodeFilter, string> = {
  ALL: "All",
  INCOME_GT_CASHIN: "Income > cash in",
  GROWTH_ON_CURRENT: "Unexplained balance",
};

export function DataHealthView({ report }: DataHealthViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<CodeFilter>("ALL");
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    month: string;
    highlightAccountIds: string[];
  }>({ open: false, month: "", highlightAccountIds: [] });

  const openWarning = (warning: DataHealthWarning) => {
    setDialogState({
      open: true,
      month: warning.month,
      highlightAccountIds: [warning.accountId],
    });
  };

  const filtered = useMemo(() => {
    if (filter === "ALL") return report.warnings;
    return report.warnings.filter((w) => w.code === filter);
  }, [filter, report.warnings]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  const codeCounts = useMemo(() => {
    const counts: Record<WarningCode, number> = {
      INCOME_GT_CASHIN: 0,
      GROWTH_ON_CURRENT: 0,
    };
    for (const w of report.warnings) counts[w.code] += 1;
    return counts;
  }, [report.warnings]);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl sm:text-2xl font-semibold">Data Health</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Automated checks over your monthly entries. Warnings flag data that
          looks inconsistent — nothing is modified automatically; use this as a
          to-do list of entries to review.
        </p>
        <WarningSummary warnings={report.warnings} />
        {report.warnings.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Covered {report.entryCount} entr
            {report.entryCount === 1 ? "y" : "ies"} across {report.accountCount}{" "}
            account{report.accountCount === 1 ? "" : "s"} and{" "}
            {report.monthsCovered.length} month
            {report.monthsCovered.length === 1 ? "" : "s"}.
          </p>
        )}
      </header>

      {report.warnings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as CodeFilter[]).map((key) => {
            const count =
              key === "ALL"
                ? report.warnings.length
                : codeCounts[key as WarningCode];
            if (key !== "ALL" && count === 0) return null;
            return (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
                className="h-8"
              >
                {FILTER_LABELS[key]}
                <Badge
                  variant={filter === key ? "secondary" : "outline"}
                  className="ml-2 text-[10px]"
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      )}

      {grouped.length === 0 ? (
        report.warnings.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            No warnings match this filter.
          </p>
        ) : null
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.month} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-sm font-semibold">
                  {formatMonth(group.month)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.warnings.length} warning
                  {group.warnings.length === 1 ? "" : "s"}
                </span>
              </div>
              <WarningList
                warnings={group.warnings}
                showMonth={false}
                showAccount
                onWarningClick={openWarning}
              />
            </section>
          ))}
        </div>
      )}

      <MonthlyEntryDialog
        open={dialogState.open}
        onOpenChange={(open) =>
          setDialogState((prev) => ({ ...prev, open }))
        }
        selectedMonth={dialogState.month}
        highlightAccountIds={dialogState.highlightAccountIds}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function groupByMonth(
  warnings: DataHealthWarning[],
): Array<{ month: string; warnings: DataHealthWarning[] }> {
  const map = new Map<string, DataHealthWarning[]>();
  for (const w of warnings) {
    const arr = map.get(w.month) ?? [];
    arr.push(w);
    map.set(w.month, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => ({ month, warnings: list }));
}

function formatMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
