"use server";

import { and, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  expenses,
  financialAccounts,
  statementCoverageOverrides,
} from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import type { AccountType } from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";

export interface StatementCoverageRow {
  accountId: string;
  accountName: string;
  type: AccountType;
  currency: Currency;
  /** Expense rows attributed to this account for the month. */
  rowCount: number;
  /** Explicit "nothing happened on this account this month". */
  noActivity: boolean;
  covered: boolean;
}

export interface StatementCoverage {
  month: string;
  accounts: StatementCoverageRow[];
  coveredCount: number;
  totalCount: number;
  complete: boolean;
}

/**
 * Which spending accounts (Current / Credit_Card) have their statement in
 * for a month. Coverage is derived — an account is covered when it has
 * expense rows for the month, or an explicit no-activity confirmation.
 */
export async function getStatementCoverage(
  month: string,
): Promise<StatementCoverage> {
  const userId = await getUserId();

  const spendingAccounts = await db
    .select({
      id: financialAccounts.id,
      name: financialAccounts.name,
      type: financialAccounts.type,
      currency: financialAccounts.currency,
    })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.userId, userId),
        eq(financialAccounts.isClosed, false),
        inArray(financialAccounts.type, ["Current", "Credit_Card"]),
      ),
    )
    .orderBy(financialAccounts.displayOrder, financialAccounts.createdAt);

  if (spendingAccounts.length === 0) {
    return {
      month,
      accounts: [],
      coveredCount: 0,
      totalCount: 0,
      complete: true,
    };
  }

  const accountIds = spendingAccounts.map((a) => a.id);

  const rowCounts = await db
    .select({ accountId: expenses.accountId, n: count() })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.month, month),
        inArray(expenses.accountId, accountIds),
      ),
    )
    .groupBy(expenses.accountId);
  const countByAccount = new Map(
    rowCounts.map((r) => [r.accountId as string, Number(r.n)]),
  );

  // The overrides table may predate its migration — treat as none.
  let overrides = new Set<string>();
  try {
    const overrideRows = await db
      .select({ accountId: statementCoverageOverrides.accountId })
      .from(statementCoverageOverrides)
      .where(
        and(
          eq(statementCoverageOverrides.userId, userId),
          eq(statementCoverageOverrides.month, month),
        ),
      );
    overrides = new Set(overrideRows.map((r) => r.accountId));
  } catch (err) {
    console.error(
      "Coverage overrides unavailable (run the 0004 migration):",
      err,
    );
  }

  const accounts: StatementCoverageRow[] = spendingAccounts.map((a) => {
    const rowCount = countByAccount.get(a.id) ?? 0;
    const noActivity = overrides.has(a.id);
    return {
      accountId: a.id,
      accountName: a.name,
      type: a.type,
      currency: (a.currency ?? "GBP") as Currency,
      rowCount,
      noActivity,
      covered: rowCount > 0 || noActivity,
    };
  });

  const coveredCount = accounts.filter((a) => a.covered).length;
  return {
    month,
    accounts,
    coveredCount,
    totalCount: accounts.length,
    complete: coveredCount === accounts.length,
  };
}

export interface CoverageMutationResult {
  success: boolean;
  error?: string;
}

/** Record "this account genuinely had nothing this month". */
export async function markNoActivity(
  accountId: string,
  month: string,
): Promise<CoverageMutationResult> {
  const userId = await getUserId();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { success: false, error: "Invalid month." };
  }

  const owned = await db
    .select({ id: financialAccounts.id })
    .from(financialAccounts)
    .where(
      and(
        eq(financialAccounts.id, accountId),
        eq(financialAccounts.userId, userId),
      ),
    )
    .limit(1);
  if (owned.length === 0) {
    return { success: false, error: "Account not found." };
  }

  try {
    await db
      .insert(statementCoverageOverrides)
      .values({ userId, accountId, month })
      .onConflictDoNothing();
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not save — has the 0004 migration run?",
    };
  }

  revalidatePaths();
  return { success: true };
}

/** Undo a no-activity confirmation. */
export async function unmarkNoActivity(
  accountId: string,
  month: string,
): Promise<CoverageMutationResult> {
  const userId = await getUserId();

  try {
    await db
      .delete(statementCoverageOverrides)
      .where(
        and(
          eq(statementCoverageOverrides.userId, userId),
          eq(statementCoverageOverrides.accountId, accountId),
          eq(statementCoverageOverrides.month, month),
        ),
      );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not update.",
    };
  }

  revalidatePaths();
  return { success: true };
}

function revalidatePaths() {
  revalidatePath("/budget");
  revalidatePath("/checkin");
}
