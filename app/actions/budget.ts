"use server";

import { and, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  expenses,
  expenseCategories,
  financialAccounts,
  incomeStreams,
  monthlyEntries,
} from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { getExchangeRates } from "@/lib/fx-rates-server";
import { isLiquidType } from "@/lib/account-helpers";
import type { Currency } from "@/lib/fx-rates";

export interface BudgetHistoryPoint {
  month: string;
  incomeGbp: number;
  spendGbp: number;
}

export interface BudgetPageData {
  /** Income for the selected month, GBP. */
  incomeTotalGbp: number;
  /** Average monthly spend per category over the prior three months, GBP. */
  categoryAverages: Record<string, number>;
  /** Income vs spend for the trailing 12 months ending at the selected month. */
  history: BudgetHistoryPoint[];
  /** "Your cash & investments cover N months" — null when not computable. */
  runway: {
    liquidGbp: number;
    avgSpendGbp: number;
    months: number;
  } | null;
}

function monthKeyOffset(month: string, offset: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

type RatesMap = Record<Currency, number>;

function toGbp(amount: number, currency: Currency, rates: RatesMap): number {
  if (currency === "GBP") return amount;
  const rate = rates[currency];
  return rate && rate !== 0 ? amount / rate : amount;
}

export async function getBudgetPageData(month: string): Promise<BudgetPageData> {
  const userId = await getUserId();

  const historyStart = monthKeyOffset(month, -11);
  const avgStart = monthKeyOffset(month, -3);

  const [incomeRows, expenseRows, excludedCategories] = await Promise.all([
    db
      .select({
        month: incomeStreams.month,
        amount: incomeStreams.amount,
        currency: incomeStreams.currency,
      })
      .from(incomeStreams)
      .where(
        and(
          eq(incomeStreams.userId, userId),
          gte(incomeStreams.month, historyStart),
          lte(incomeStreams.month, month),
        ),
      ),
    db
      .select({
        month: expenses.month,
        amount: expenses.amount,
        currency: expenses.currency,
        categoryId: expenses.categoryId,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.userId, userId),
          gte(expenses.month, historyStart),
          lte(expenses.month, month),
        ),
      ),
    db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(
        and(
          eq(expenseCategories.userId, userId),
          eq(expenseCategories.excludeFromSpend, true),
        ),
      ),
  ]);

  const excludedIds = new Set(excludedCategories.map((c) => c.id));

  // One FX lookup per month in the window.
  const monthsInWindow = new Set<string>([month]);
  for (const r of incomeRows) monthsInWindow.add(r.month);
  for (const r of expenseRows) monthsInWindow.add(r.month);
  const ratesByMonth = new Map<string, RatesMap>();
  await Promise.all(
    Array.from(monthsInWindow).map(async (m) => {
      const { rates } = await getExchangeRates(m);
      ratesByMonth.set(m, rates);
    }),
  );
  const rateFor = (m: string): RatesMap =>
    ratesByMonth.get(m) ?? { GBP: 1, EUR: 1, USD: 1, AED: 1 };

  // Income and spend per month.
  const incomeByMonth = new Map<string, number>();
  for (const r of incomeRows) {
    const value = toGbp(
      Number(r.amount || 0),
      (r.currency ?? "GBP") as Currency,
      rateFor(r.month),
    );
    incomeByMonth.set(r.month, (incomeByMonth.get(r.month) ?? 0) + value);
  }

  const spendByMonth = new Map<string, number>();
  const categorySpendPriorMonths = new Map<string, number>();
  const monthsWithSpend = new Set<string>();
  for (const r of expenseRows) {
    if (r.categoryId && excludedIds.has(r.categoryId)) continue;
    const value = toGbp(
      Number(r.amount || 0),
      (r.currency ?? "GBP") as Currency,
      rateFor(r.month),
    );
    spendByMonth.set(r.month, (spendByMonth.get(r.month) ?? 0) + value);
    monthsWithSpend.add(r.month);

    // Category averages: the three months before the selected one.
    if (r.month >= avgStart && r.month < month) {
      const key = r.categoryId ?? "__uncategorised__";
      categorySpendPriorMonths.set(
        key,
        (categorySpendPriorMonths.get(key) ?? 0) + value,
      );
    }
  }

  // Legacy fallback for months with no expense rows: per-account expenditure.
  const legacyMonths: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = monthKeyOffset(month, -i);
    if (!monthsWithSpend.has(m)) legacyMonths.push(m);
  }
  if (legacyMonths.length > 0) {
    const legacyRows = await db
      .select({
        month: monthlyEntries.month,
        expenditure: monthlyEntries.expenditure,
        type: financialAccounts.type,
        currency: financialAccounts.currency,
      })
      .from(monthlyEntries)
      .innerJoin(
        financialAccounts,
        eq(monthlyEntries.accountId, financialAccounts.id),
      )
      .where(
        and(
          eq(financialAccounts.userId, userId),
          inArray(monthlyEntries.month, legacyMonths),
        ),
      );
    for (const row of legacyRows) {
      if (row.type !== "Current" && row.type !== "Credit_Card") continue;
      const { rates } = ratesByMonth.has(row.month)
        ? { rates: rateFor(row.month) }
        : await getExchangeRates(row.month);
      const value = toGbp(
        Number(row.expenditure || 0),
        (row.currency ?? "GBP") as Currency,
        rates,
      );
      spendByMonth.set(row.month, (spendByMonth.get(row.month) ?? 0) + value);
    }
  }

  const history: BudgetHistoryPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = monthKeyOffset(month, -i);
    history.push({
      month: m,
      incomeGbp: incomeByMonth.get(m) ?? 0,
      spendGbp: spendByMonth.get(m) ?? 0,
    });
  }

  // Average per category over however many of the three prior months exist.
  const priorMonthsWithData = new Set<string>();
  for (const r of expenseRows) {
    if (r.month >= avgStart && r.month < month) priorMonthsWithData.add(r.month);
  }
  const divisor = Math.max(priorMonthsWithData.size, 1);
  const categoryAverages: Record<string, number> = {};
  for (const [key, total] of categorySpendPriorMonths) {
    categoryAverages[key] = total / divisor;
  }

  // Runway: liquid assets at the latest recorded month vs trailing avg spend.
  let runway: BudgetPageData["runway"] = null;
  try {
    const liquidRows = await db
      .select({
        accountId: monthlyEntries.accountId,
        month: monthlyEntries.month,
        endingBalance: monthlyEntries.endingBalance,
        type: financialAccounts.type,
        currency: financialAccounts.currency,
      })
      .from(monthlyEntries)
      .innerJoin(
        financialAccounts,
        eq(monthlyEntries.accountId, financialAccounts.id),
      )
      .where(
        and(
          eq(financialAccounts.userId, userId),
          eq(financialAccounts.isClosed, false),
          lte(monthlyEntries.month, month),
          lt(monthlyEntries.month, monthKeyOffset(month, 1)),
        ),
      );

    // Latest entry per liquid account.
    const latestByAccount = new Map<
      string,
      { month: string; balance: number; currency: Currency }
    >();
    for (const row of liquidRows) {
      if (!isLiquidType(row.type)) continue;
      const prev = latestByAccount.get(row.accountId);
      if (!prev || row.month > prev.month) {
        latestByAccount.set(row.accountId, {
          month: row.month,
          balance: Number(row.endingBalance),
          currency: (row.currency ?? "GBP") as Currency,
        });
      }
    }

    let liquidGbp = 0;
    for (const entry of latestByAccount.values()) {
      const rates = ratesByMonth.get(entry.month) ?? rateFor(month);
      liquidGbp += toGbp(entry.balance, entry.currency, rates);
    }

    const recentSpend = history
      .slice(-3)
      .map((h) => h.spendGbp)
      .filter((v) => v > 0);
    const avgSpendGbp =
      recentSpend.length > 0
        ? recentSpend.reduce((a, b) => a + b, 0) / recentSpend.length
        : 0;

    if (liquidGbp > 0 && avgSpendGbp > 0) {
      runway = {
        liquidGbp,
        avgSpendGbp,
        months: liquidGbp / avgSpendGbp,
      };
    }
  } catch (err) {
    console.error("Runway unavailable:", err);
  }

  return {
    incomeTotalGbp: incomeByMonth.get(month) ?? 0,
    categoryAverages,
    history,
    runway,
  };
}
