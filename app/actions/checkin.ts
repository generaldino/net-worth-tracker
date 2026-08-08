"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { financialAccounts, monthlyEntries } from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";

export interface CheckinStatus {
  /** Previous completed calendar month, "YYYY-MM". */
  month: string;
  /** Short label for the month, e.g. "July". */
  monthLabel: string;
  openAccountCount: number;
  /** Open accounts with no entry for `month`. */
  missingCount: number;
  /** True when every open account has a value for `month`. */
  done: boolean;
}

/** Previous completed calendar month as "YYYY-MM". */
function previousMonthKey(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
}

function monthShortLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
  });
}

/**
 * State for the "Check in" button in the top bar. Own accounts only —
 * viewers of a shared dashboard are not prompted to update it.
 */
export async function getCheckinStatus(): Promise<CheckinStatus | null> {
  try {
    const userId = await getUserId();
    const month = previousMonthKey();

    const openAccounts = await db
      .select({ id: financialAccounts.id })
      .from(financialAccounts)
      .where(
        and(
          eq(financialAccounts.userId, userId),
          eq(financialAccounts.isClosed, false),
        ),
      );

    if (openAccounts.length === 0) return null;

    const accountIds = openAccounts.map((a) => a.id);
    const entries = await db
      .select({ accountId: monthlyEntries.accountId })
      .from(monthlyEntries)
      .where(
        and(
          inArray(monthlyEntries.accountId, accountIds),
          eq(monthlyEntries.month, month),
        ),
      );

    const updated = new Set(entries.map((e) => e.accountId));
    const missingCount = accountIds.filter((id) => !updated.has(id)).length;

    return {
      month,
      monthLabel: monthShortLabel(month),
      openAccountCount: openAccounts.length,
      missingCount,
      done: missingCount === 0,
    };
  } catch (error) {
    console.error("Error getting check-in status:", error);
    return null;
  }
}
