"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ExpenseDialog } from "@/components/budget/expense-dialog";
import { ImportDialog } from "@/components/budget/import-dialog";
import { ReviewPanel } from "@/components/budget/review-panel";
import { deleteExpense, type ExpenseRow } from "@/app/actions/expenses";
import type { CategoryRow } from "@/app/actions/expense-categories";

interface BudgetViewProps {
  month: string;
  months: string[];
  expenses: ExpenseRow[];
  categories: CategoryRow[];
  accounts: Array<{ id: string; name: string; type: string }>;
  categoryTotals: Array<{
    categoryId: string | null;
    name: string;
    color: string;
    excludeFromSpend: boolean;
    total: number;
  }>;
  uncategorisedCount: number;
}

const ALL_CATEGORIES = "__all__";
const UNCATEGORISED = "__uncategorised__";

function formatMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
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
}: BudgetViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editRow, setEditRow] = useState<ExpenseRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ExpenseRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES);

  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const visibleExpenses = useMemo(() => {
    if (categoryFilter === ALL_CATEGORIES) return expenses;
    if (categoryFilter === UNCATEGORISED) {
      return expenses.filter((e) => e.categoryId === null);
    }
    return expenses.filter((e) => e.categoryId === categoryFilter);
  }, [expenses, categoryFilter]);

  // Spend excludes categories flagged "not spending" (card payments/transfers).
  const monthSpend = useMemo(
    () =>
      categoryTotals
        .filter((t) => !t.excludeFromSpend)
        .reduce((sum, t) => sum + t.total, 0),
    [categoryTotals],
  );

  const changeMonth = (next: string) => {
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

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl sm:text-2xl font-semibold">Budget</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add expense</span>
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Track what you spend and where it goes. Import a card statement or add
          expenses by hand, then categorise them.
        </p>
      </header>

      {/* Month + totals */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={month} onValueChange={changeMonth}>
          <SelectTrigger className="h-9 w-[190px]">
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

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {formatCurrencyAmount(monthSpend, "GBP")}
          </span>
          <span className="text-xs text-muted-foreground">spent</span>
        </div>

        {uncategorisedCount > 0 && (
          <Button
            variant={categoryFilter === UNCATEGORISED ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() =>
              setCategoryFilter((prev) =>
                prev === UNCATEGORISED ? ALL_CATEGORIES : UNCATEGORISED,
              )
            }
          >
            {uncategorisedCount} uncategorised
          </Button>
        )}
      </div>

      {/* Uncategorised review — merchant-grouped bulk categorisation */}
      <ReviewPanel expenses={expenses} categories={categories} />

      {/* Category totals */}
      {categoryTotals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryTotals.map((t) => (
            <button
              key={t.categoryId ?? UNCATEGORISED}
              type="button"
              onClick={() =>
                setCategoryFilter(t.categoryId ?? UNCATEGORISED)
              }
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition hover:bg-muted/50",
                (categoryFilter === (t.categoryId ?? UNCATEGORISED)) &&
                  "ring-2 ring-ring",
              )}
            >
              <span className={cn("size-2.5 rounded-full", swatch(t.color))} />
              <span className="text-sm">{t.name}</span>
              <span className="text-sm font-medium tabular-nums">
                {formatCurrencyAmount(t.total, "GBP")}
              </span>
              {t.excludeFromSpend && (
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-normal"
                >
                  excl.
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Expenses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Expenses
            {categoryFilter !== ALL_CATEGORIES && (
              <Button
                variant="link"
                size="sm"
                className="ml-2 h-auto p-0 text-xs"
                onClick={() => setCategoryFilter(ALL_CATEGORIES)}
              >
                clear filter
              </Button>
            )}
          </h2>
          <span className="text-xs text-muted-foreground">
            {visibleExpenses.length} of {expenses.length}
          </span>
        </div>

        {visibleExpenses.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">
              {expenses.length === 0
                ? "No expenses for this month"
                : "No expenses match this filter"}
            </p>
            {expenses.length === 0 && (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Import a card statement or add one by hand.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    onClick={() => setImportOpen(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Upload className="size-4" />
                    Import CSV
                  </Button>
                  <Button onClick={openAdd} size="sm">
                    <Plus className="size-4" />
                    Add expense
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
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
                {visibleExpenses.map((row) => {
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
                              className={cn(
                                "size-2 rounded-full",
                                swatch(cat.color),
                              )}
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
        )}
      </section>

      <CategoriesManager categories={categories} />

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
        onOpenChange={setImportOpen}
        accounts={accounts}
        onImported={() => router.refresh()}
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
