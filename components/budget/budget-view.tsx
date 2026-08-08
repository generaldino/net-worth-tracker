"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Crosshair,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Rows3,
  Tags,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { colorVariantsBackground } from "@/lib/color-variants";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import { CategoriesManager } from "@/components/budget/categories-manager";
import { StatementCoverageStrip } from "@/components/budget/statement-coverage";
import { TargetsDialog } from "@/components/budget/targets-dialog";
import { ExpenseDialog } from "@/components/budget/expense-dialog";
import { ImportDialog } from "@/components/budget/import-dialog";
import { ReviewPanel } from "@/components/budget/review-panel";
import { CompositionBar } from "@/components/budget/composition-bar";
import { TopMerchants } from "@/components/budget/top-merchants";
import { CategoryDrilldown } from "@/components/budget/category-drilldown";
import {
  CategoryBars,
  type CategoryTotalRow,
} from "@/components/budget/category-bars";
import { deleteExpense, type ExpenseRow } from "@/app/actions/expenses";
import type { CategoryRow } from "@/app/actions/expense-categories";
import type { BudgetPageData } from "@/app/actions/budget";
import type { StatementCoverage } from "@/app/actions/statements";

const HistoryChart = dynamic(
  () => import("@/components/budget/history-chart").then((m) => m.HistoryChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] w-full animate-pulse rounded-lg bg-muted/30" />
    ),
  },
);

interface BudgetViewProps {
  month: string;
  months: string[];
  expenses: ExpenseRow[];
  categories: CategoryRow[];
  accounts: Array<{ id: string; name: string; type: string }>;
  categoryTotals: CategoryTotalRow[];
  uncategorisedCount: number;
  incomeTotalGbp: number;
  categoryAverages: Record<string, number>;
  history: BudgetPageData["history"];
  runway: BudgetPageData["runway"];
  spendTrackedSince: string | null;
  topMerchants: BudgetPageData["topMerchants"];
  categorySparklines: Record<string, number[]>;
  sparklineMonths: string[];
  coverage: StatementCoverage;
  /** Auto-open the import dialog preselected to this account (deep link). */
  autoImportAccountId?: string | null;
}

const UNCATEGORISED = "__uncategorised__";

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function swatch(color: string) {
  return (
    colorVariantsBackground[color as keyof typeof colorVariantsBackground] ??
    colorVariantsBackground.blue
  );
}

export function BudgetView({
  month,
  months,
  expenses,
  categories,
  accounts,
  categoryTotals,
  uncategorisedCount,
  incomeTotalGbp,
  categoryAverages,
  history,
  runway,
  spendTrackedSince,
  topMerchants,
  categorySparklines,
  sparklineMonths,
  coverage,
  autoImportAccountId,
}: BudgetViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importAccountId, setImportAccountId] = useState<string | null>(null);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ExpenseRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  /** Category id or "__uncategorised__" — drives the in-place drill-down. */
  const [drillKey, setDrillKey] = useState<string | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showCategoriesManager, setShowCategoriesManager] = useState(false);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Deep link from the check-in's coverage chips: open the import dialog
  // preselected to the account whose statement is missing.
  useEffect(() => {
    if (autoImportAccountId) {
      setImportAccountId(autoImportAccountId);
      setImportOpen(true);
    }
  }, [autoImportAccountId]);

  const openImportFor = (accountId: string | null) => {
    setImportAccountId(accountId);
    setImportOpen(true);
  };

  // Spend excludes categories flagged "not spending" (card payments/transfers).
  const monthSpend = useMemo(
    () =>
      categoryTotals
        .filter((t) => !t.excludeFromSpend)
        .reduce((sum, t) => sum + t.total, 0),
    [categoryTotals],
  );

  // The plan: sum of category targets (active, spending categories only).
  const plannedTotal = useMemo(
    () =>
      categories
        .filter((c) => !c.excludeFromSpend && c.monthlyTarget !== null)
        .reduce((sum, c) => sum + (c.monthlyTarget ?? 0), 0),
    [categories],
  );

  const kept = incomeTotalGbp - monthSpend;
  const savingsRate =
    incomeTotalGbp > 0 ? Math.round((kept / incomeTotalGbp) * 100) : null;

  // Pacing, only meaningful for the month we're inside.
  const pace = useMemo(() => {
    if (month !== currentMonthKey() || plannedTotal <= 0) return null;
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const daysLeft = daysInMonth - now.getDate();
    const expected = plannedTotal * (now.getDate() / daysInMonth);
    return {
      daysLeft,
      onTrack: monthSpend <= expected * 1.05,
      over: monthSpend > plannedTotal,
    };
  }, [month, plannedTotal, monthSpend]);

  // One computed sentence: the biggest mover against its own 3-month average.
  const insight = useMemo(() => {
    let best: { name: string; spent: number; avg: number; delta: number } | null =
      null;
    for (const t of categoryTotals) {
      if (t.excludeFromSpend || !t.categoryId) continue;
      const avg = categoryAverages[t.categoryId];
      if (!avg || avg <= 0) continue;
      const delta = t.total - avg;
      // Ignore noise: a mover must be at least £20 and 15% off its average.
      if (Math.abs(delta) < Math.max(20, avg * 0.15)) continue;
      if (!best || Math.abs(delta) > Math.abs(best.delta)) {
        best = { name: t.name, spent: t.total, avg, delta };
      }
    }
    return best;
  }, [categoryTotals, categoryAverages]);

  // Drill-down data for the selected category.
  const drill = useMemo(() => {
    if (!drillKey) return null;
    const category =
      drillKey === UNCATEGORISED ? null : (categoriesById.get(drillKey) ?? null);
    if (drillKey !== UNCATEGORISED && !category) return null;
    const rows = expenses.filter((e) =>
      drillKey === UNCATEGORISED
        ? e.categoryId === null
        : e.categoryId === drillKey,
    );
    const totalRow = categoryTotals.find(
      (t) => (t.categoryId ?? UNCATEGORISED) === drillKey,
    );
    return {
      category,
      rows,
      totalGbp: totalRow?.total ?? 0,
      avgGbp: categoryAverages[drillKey] ?? null,
      sparkline: categorySparklines[drillKey] ?? null,
    };
  }, [
    drillKey,
    categoriesById,
    expenses,
    categoryTotals,
    categoryAverages,
    categorySparklines,
  ]);

  const changeMonth = (next: string) => {
    setDrillKey(null);
    router.push(`/budget?month=${next}`);
  };

  const openAdd = () => {
    setEditRow(null);
    setDialogOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditRow(row);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setPendingId(deleteRow.id);
    const result = await deleteExpense(deleteRow.id);
    setPendingId(null);

    if (result.success) {
      toast({ title: "Expense deleted" });
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: result.error,
      });
    }
    setDeleteRow(null);
  };

  const monthLabel = formatMonthLabel(month);
  const isEmpty = expenses.length === 0;

  return (
    <div className="space-y-6">
      {/* Header: title, month, maintenance menu */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl sm:text-2xl font-semibold">Budget</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={changeMonth}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-9" aria-label="Budget actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={openAdd}>
                <Plus className="mr-2 size-4" />
                Add expense
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openImportFor(null)}>
                <Upload className="mr-2 size-4" />
                Import CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTargetsOpen(true)}>
                <Crosshair className="mr-2 size-4" />
                Set targets…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={showAllTransactions}
                onCheckedChange={(v) => setShowAllTransactions(v === true)}
              >
                <Rows3 className="mr-2 size-4" />
                All transactions
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showCategoriesManager}
                onCheckedChange={(v) => setShowCategoriesManager(v === true)}
              >
                <Tags className="mr-2 size-4" />
                Manage categories
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* The month at a glance */}
      <div className="rounded-xl border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">
              Spent{plannedTotal > 0 ? " · planned" : ""}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight">
              {formatCurrencyAmount(monthSpend, "GBP")}
              {plannedTotal > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {formatCurrencyAmount(plannedTotal, "GBP")}
                </span>
              )}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {pace && (
                <Badge
                  variant="secondary"
                  className={cn(
                    pace.over
                      ? "bg-red-500/10 text-red-600 dark:text-red-400"
                      : pace.onTrack
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {pace.over
                    ? "over budget"
                    : pace.onTrack
                      ? "on track"
                      : "running hot"}
                  {" · "}
                  {pace.daysLeft}d left
                </Badge>
              )}
              {!coverage.complete && (
                <Badge
                  variant="secondary"
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  title="Spend is understated until every statement is in"
                >
                  {coverage.totalCount - coverage.coveredCount} statement
                  {coverage.totalCount - coverage.coveredCount === 1 ? "" : "s"}{" "}
                  missing
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-2xl font-bold tabular-nums leading-tight">
              {formatCurrencyAmount(incomeTotalGbp, "GBP")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">
              Kept{savingsRate !== null ? ` · ${savingsRate}% of income` : ""}
            </p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums leading-tight",
                kept >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {formatCurrencyAmount(kept, "GBP")}
            </p>
          </div>
        </div>

        <div className="mt-3 border-t pt-3">
          <StatementCoverageStrip
            coverage={coverage}
            onImport={(accountId) => openImportFor(accountId)}
          />
        </div>

        {plannedTotal === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            No targets set —{" "}
            <button
              type="button"
              onClick={() => setTargetsOpen(true)}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              set your targets
            </button>{" "}
            to see over/under per category.
          </p>
        )}

        {insight && (
          <p className="mt-3 border-t pt-3 text-sm">
            <span className="font-medium">Biggest change:</span>{" "}
            {insight.name} —{" "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                insight.delta > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {formatCurrencyAmount(insight.spent, "GBP")}
            </span>{" "}
            vs your usual {formatCurrencyAmount(insight.avg, "GBP")}.
          </p>
        )}

        {runway && (
          <p className="mt-2 text-xs text-muted-foreground">
            Your cash &amp; investments (
            {formatCurrencyAmount(runway.liquidGbp, "GBP")}) cover about{" "}
            <span className="font-medium text-foreground">
              {runway.months >= 24
                ? `${(runway.months / 12).toFixed(1)} years`
                : `${Math.round(runway.months)} months`}
            </span>{" "}
            at your recent spend (
            {formatCurrencyAmount(runway.avgSpendGbp, "GBP")}/month, trailing
            3-month average; excludes pensions and property).
          </p>
        )}
      </div>

      {/* Uncategorised review — merchant-grouped bulk categorisation */}
      <ReviewPanel expenses={expenses} categories={categories} />

      {/* Where it went */}
      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            No expenses for {monthLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a card statement or add one by hand.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button onClick={() => openImportFor(null)} size="sm" variant="outline">
              <Upload className="size-4" />
              Import CSV
            </Button>
            <Button onClick={openAdd} size="sm">
              <Plus className="size-4" />
              Add expense
            </Button>
          </div>
        </div>
      ) : (
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">Where it went</h2>
            {uncategorisedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setDrillKey((prev) =>
                    prev === UNCATEGORISED ? null : UNCATEGORISED,
                  )
                }
                className={cn(
                  "text-xs text-muted-foreground underline-offset-2 hover:underline",
                  drillKey === UNCATEGORISED && "font-semibold text-foreground",
                )}
              >
                {uncategorisedCount} uncategorised
              </button>
            )}
          </div>

          <CompositionBar
            totals={categoryTotals}
            activeFilter={drillKey}
            onFilter={setDrillKey}
          />

          <CategoryBars
            categories={categories}
            totals={categoryTotals}
            averages={categoryAverages}
            activeFilter={
              drillKey === UNCATEGORISED ? null : drillKey
            }
            onFilter={(id) => setDrillKey(id)}
          />

          {drill && (
            <CategoryDrilldown
              category={drill.category}
              monthLabel={monthLabel}
              expenses={drill.rows}
              totalGbp={drill.totalGbp}
              avgGbp={drill.avgGbp}
              sparkline={drill.sparkline}
              sparklineMonths={sparklineMonths}
              onEdit={openEdit}
              onDelete={setDeleteRow}
              onClose={() => setDrillKey(null)}
            />
          )}
        </section>
      )}

      {!isEmpty && <TopMerchants merchants={topMerchants} />}

      <HistoryChart history={history} spendTrackedSince={spendTrackedSince} />

      {/* All transactions — on demand, from the ⋯ menu */}
      {showAllTransactions && !isEmpty && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">All transactions</h2>
            <span className="text-xs text-muted-foreground">
              {expenses.length} in {monthLabel}
            </span>
          </div>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((row) => {
                  const busy = pendingId === row.id;
                  const cat = row.categoryId
                    ? categoriesById.get(row.categoryId)
                    : null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {row.date}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.description}
                        {row.source === "backfill" && (
                          <Badge
                            variant="secondary"
                            className="ml-2 h-4 px-1.5 text-[10px] font-normal"
                          >
                            historic
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {cat ? (
                          <span className="flex items-center gap-1.5 text-sm">
                            <span
                              className={cn("size-2 rounded-full", swatch(cat.color))}
                            />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Uncategorised
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrencyAmount(row.amount, row.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Edit"
                            disabled={busy}
                            onClick={() => openEdit(row)}
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            title="Delete"
                            disabled={busy}
                            onClick={() => setDeleteRow(row)}
                          >
                            {busy ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {/* Category admin — on demand, from the ⋯ menu */}
      {showCategoriesManager && <CategoriesManager categories={categories} />}

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editRow}
        categories={categories}
        accounts={accounts}
        defaultMonth={month}
        onSaved={() => router.refresh()}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) setImportAccountId(null);
        }}
        accounts={accounts}
        defaultAccountId={importAccountId}
        onImported={() => router.refresh()}
      />

      <TargetsDialog
        open={targetsOpen}
        onOpenChange={setTargetsOpen}
        categories={categories}
        averages={categoryAverages}
        incomeTotalGbp={incomeTotalGbp}
        onSaved={() => router.refresh()}
      />

      <AlertDialog
        open={deleteRow !== null}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow?.description} —{" "}
              {deleteRow &&
                formatCurrencyAmount(deleteRow.amount, deleteRow.currency)}
              . This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
