"use server";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses, expenseCategories } from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { getExchangeRates } from "@/lib/fx-rates-server";
import type { Currency } from "@/lib/fx-rates";
import { revalidatePath } from "next/cache";

export interface ExpenseRow {
  id: string;
  date: string; // "YYYY-MM-DD"
  month: string; // "YYYY-MM"
  amount: number;
  currency: Currency;
  description: string;
  merchant: string | null;
  categoryId: string | null;
  accountId: string | null;
  source: "manual" | "import" | "backfill";
  importBatchId: string | null;
}

export interface ExpenseInput {
  date: string;
  amount: number;
  currency: Currency;
  description: string;
  categoryId: string | null;
  accountId: string | null;
}

export interface ExpenseMutationResult {
  success: boolean;
  error?: string;
}

export interface ExpenseFilters {
  month?: string;
  categoryId?: string;
  uncategorisedOnly?: boolean;
}

function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function toRow(row: typeof expenses.$inferSelect): ExpenseRow {
  return {
    id: row.id,
    date: row.date,
    month: row.month,
    amount: Number(row.amount),
    currency: (row.currency ?? "GBP") as Currency,
    description: row.description,
    merchant: row.merchant,
    categoryId: row.categoryId,
    accountId: row.accountId,
    source: row.source,
    importBatchId: row.importBatchId,
  };
}

/** Lists the user's expenses, newest first, optionally filtered. */
export async function getExpenses(
  filters: ExpenseFilters = {},
): Promise<ExpenseRow[]> {
  const userId = await getUserId();

  const conditions = [eq(expenses.userId, userId)];
  if (filters.month) conditions.push(eq(expenses.month, filters.month));
  if (filters.uncategorisedOnly) {
    conditions.push(isNull(expenses.categoryId));
  } else if (filters.categoryId) {
    conditions.push(eq(expenses.categoryId, filters.categoryId));
  }

  try {
    const rows = await db
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.date), desc(expenses.createdAt));
    return rows.map(toRow);
  } catch (err) {
    console.error("Failed to load expenses:", err);
    return [];
  }
}

/** Months that have at least one expense, newest first. */
export async function getExpenseMonths(): Promise<string[]> {
  const userId = await getUserId();
  try {
    const rows = await db
      .selectDistinct({ month: expenses.month })
      .from(expenses)
      .where(eq(expenses.userId, userId))
      .orderBy(desc(expenses.month));
    return rows.map((r) => r.month);
  } catch (err) {
    console.error("Failed to load expense months:", err);
    return [];
  }
}

/** Count of uncategorised expenses, for the review badge. */
export async function getUncategorisedCount(month?: string): Promise<number> {
  const userId = await getUserId();
  const conditions = [eq(expenses.userId, userId), isNull(expenses.categoryId)];
  if (month) conditions.push(eq(expenses.month, month));

  try {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(expenses)
      .where(and(...conditions));
    return rows[0]?.count ?? 0;
  } catch (err) {
    console.error("Failed to count uncategorised expenses:", err);
    return 0;
  }
}

function validate(input: ExpenseInput): string | null {
  if (!isValidDate(input.date)) return "A valid date is required.";
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    return "Amount must be a non-zero number.";
  }
  if (!input.description || input.description.trim().length === 0) {
    return "Description is required.";
  }
  return null;
}

export async function createExpense(
  input: ExpenseInput,
): Promise<ExpenseMutationResult> {
  const userId = await getUserId();

  const invalid = validate(input);
  if (invalid) return { success: false, error: invalid };

  try {
    await db.insert(expenses).values({
      userId,
      date: input.date,
      month: monthFromDate(input.date),
      amount: input.amount.toString(),
      currency: input.currency,
      description: input.description.trim(),
      merchant: input.description.trim().toLowerCase(),
      categoryId: input.categoryId,
      accountId: input.accountId,
      source: "manual",
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to add expense.",
    };
  }

  revalidatePaths();
  return { success: true };
}

export async function updateExpense(
  id: string,
  input: ExpenseInput,
): Promise<ExpenseMutationResult> {
  const userId = await getUserId();

  const invalid = validate(input);
  if (invalid) return { success: false, error: invalid };

  try {
    const updated = await db
      .update(expenses)
      .set({
        date: input.date,
        month: monthFromDate(input.date),
        amount: input.amount.toString(),
        currency: input.currency,
        description: input.description.trim(),
        categoryId: input.categoryId,
        accountId: input.accountId,
        updatedAt: new Date(),
      })
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning({ id: expenses.id });

    if (updated.length === 0) {
      return { success: false, error: "Expense not found." };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update expense.",
    };
  }

  revalidatePaths();
  return { success: true };
}

export async function deleteExpense(
  id: string,
): Promise<ExpenseMutationResult> {
  const userId = await getUserId();

  try {
    await db
      .delete(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete expense.",
    };
  }

  revalidatePaths();
  return { success: true };
}

/**
 * Assigns a category to many expenses at once — the workhorse of the review
 * screen, where you categorise a whole merchant group in one go.
 */
export async function bulkSetCategory(
  ids: string[],
  categoryId: string | null,
): Promise<ExpenseMutationResult> {
  const userId = await getUserId();
  if (ids.length === 0) return { success: true };

  try {
    await db
      .update(expenses)
      .set({ categoryId, updatedAt: new Date() })
      .where(and(eq(expenses.userId, userId), inArray(expenses.id, ids)));
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to categorise.",
    };
  }

  revalidatePaths();
  return { success: true };
}

/** Per-category totals for a month, for the budget summary. */
export async function getCategoryTotals(month: string): Promise<
  Array<{
    categoryId: string | null;
    name: string;
    color: string;
    excludeFromSpend: boolean;
    total: number;
  }>
> {
  const userId = await getUserId();

  try {
    const rows = await db
      .select({
        categoryId: expenses.categoryId,
        amount: expenses.amount,
        currency: expenses.currency,
        name: expenseCategories.name,
        color: expenseCategories.color,
        excludeFromSpend: expenseCategories.excludeFromSpend,
      })
      .from(expenses)
      .leftJoin(
        expenseCategories,
        eq(expenses.categoryId, expenseCategories.id),
      )
      .where(and(eq(expenses.userId, userId), eq(expenses.month, month)));

    // Totals are reported in GBP: non-GBP rows convert at the month's rate,
    // so a €50 expense no longer counts as £50.
    const { rates } = await getExchangeRates(month);
    const toGbp = (amount: number, currency: string) => {
      if (currency === "GBP") return amount;
      const rate = rates[currency as keyof typeof rates];
      return rate && rate !== 0 ? amount / rate : amount;
    };

    const byCategory = new Map<
      string,
      {
        categoryId: string | null;
        name: string;
        color: string;
        excludeFromSpend: boolean;
        total: number;
      }
    >();

    for (const row of rows) {
      const key = row.categoryId ?? "__uncategorised__";
      const existing = byCategory.get(key);
      const amount = toGbp(Number(row.amount || 0), row.currency ?? "GBP");
      if (existing) {
        existing.total += amount;
      } else {
        byCategory.set(key, {
          categoryId: row.categoryId,
          name: row.name ?? "Uncategorised",
          color: row.color ?? "blue",
          excludeFromSpend: row.excludeFromSpend ?? false,
          total: amount,
        });
      }
    }

    return Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
  } catch (err) {
    console.error("Failed to load category totals:", err);
    return [];
  }
}

function revalidatePaths() {
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/accounts");
}
