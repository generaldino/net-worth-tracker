import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { expenses, expenseCategories } from "@/db/schema";
import type { Currency } from "@/lib/fx-rates";

export interface MonthCurrencyTotal {
  currency: Currency;
  amount: number;
}

/**
 * Spend per month per currency, summed from the expenses table.
 *
 * Categories flagged `excludeFromSpend` (card payments, transfers between your
 * own accounts) are left out — they move money, they don't spend it.
 * Uncategorised expenses DO count, otherwise spend would silently understate
 * until everything is filed.
 *
 * Returns an empty map on any failure so callers fall back to the legacy
 * `monthly_entries.expenditure` values rather than reporting zero spend.
 */
export async function getMonthlyExpenseTotals(
  userIds: string[],
): Promise<Map<string, MonthCurrencyTotal[]>> {
  const byMonth = new Map<string, MonthCurrencyTotal[]>();
  if (userIds.length === 0) return byMonth;

  try {
    const excluded = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.excludeFromSpend, true));
    const excludedIds = new Set(excluded.map((c) => c.id));

    const rows = await db
      .select({
        month: expenses.month,
        amount: expenses.amount,
        currency: expenses.currency,
        categoryId: expenses.categoryId,
      })
      .from(expenses)
      .where(inArray(expenses.userId, userIds));

    const acc = new Map<string, Map<Currency, number>>();
    for (const row of rows) {
      if (row.categoryId && excludedIds.has(row.categoryId)) continue;
      const currency = (row.currency ?? "GBP") as Currency;
      const monthMap = acc.get(row.month) ?? new Map<Currency, number>();
      monthMap.set(
        currency,
        (monthMap.get(currency) ?? 0) + Number(row.amount || 0),
      );
      acc.set(row.month, monthMap);
    }

    for (const [month, currencyMap] of acc) {
      byMonth.set(
        month,
        Array.from(currencyMap.entries()).map(([currency, amount]) => ({
          currency,
          amount,
        })),
      );
    }
  } catch (err) {
    console.error(
      "Expense totals unavailable, falling back to legacy expenditure:",
      err,
    );
    return new Map();
  }

  return byMonth;
}
