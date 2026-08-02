"use server";

import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { incomeStreams } from "@/db/schema";
import type { Currency } from "@/lib/fx-rates";
import { getAccessibleUserIds } from "@/app/actions/sharing";
import { getUserId } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export interface IncomeStreamDraft {
  name: string;
  amount: number;
  currency: Currency;
}

export interface IncomeStreamRow extends IncomeStreamDraft {
  id: string;
}

export interface MonthIncomeData {
  month: string;
  streams: IncomeStreamRow[];
  /** Names used in the most recent prior month, for carry-forward in the UI. */
  suggestedNames: string[];
}

export interface SaveIncomeStreamsResult {
  success: boolean;
  savedCount: number;
  error?: string;
}

/**
 * Income streams the current user can edit for a given month, plus the names
 * they used most recently (so the editor can pre-fill recurring streams).
 */
export async function getMonthIncomeData(month: string): Promise<MonthIncomeData> {
  const userId = await getUserId();
  if (!userId) {
    return { month, streams: [], suggestedNames: [] };
  }

  const rows = await db
    .select()
    .from(incomeStreams)
    .where(and(eq(incomeStreams.userId, userId), eq(incomeStreams.month, month)));

  const streams: IncomeStreamRow[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    currency: (r.currency ?? "GBP") as Currency,
  }));

  // Carry-forward: names from the most recent month before this one.
  let suggestedNames: string[] = [];
  if (streams.length === 0) {
    const priorRows = await db
      .select({ month: incomeStreams.month, name: incomeStreams.name })
      .from(incomeStreams)
      .where(and(eq(incomeStreams.userId, userId), lt(incomeStreams.month, month)))
      .orderBy(desc(incomeStreams.month));

    const latestPriorMonth = priorRows[0]?.month;
    if (latestPriorMonth) {
      const names = priorRows
        .filter((r) => r.month === latestPriorMonth)
        .map((r) => r.name);
      suggestedNames = Array.from(new Set(names));
    }
  }

  return { month, streams, suggestedNames };
}

/**
 * Replace the current user's income streams for a month. Blank/zero rows are
 * dropped, so the editor can add, edit and remove lines with one save.
 */
export async function saveIncomeStreams(
  month: string,
  drafts: IncomeStreamDraft[],
): Promise<SaveIncomeStreamsResult> {
  const userId = await getUserId();
  if (!userId) {
    return { success: false, savedCount: 0, error: "Not authenticated" };
  }

  const cleaned = drafts
    .map((d) => ({
      name: d.name.trim(),
      amount: Number.isFinite(d.amount) ? d.amount : 0,
      currency: d.currency,
    }))
    .filter((d) => d.name.length > 0 && d.amount !== 0);

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(incomeStreams)
        .where(
          and(eq(incomeStreams.userId, userId), eq(incomeStreams.month, month)),
        );

      if (cleaned.length > 0) {
        await tx.insert(incomeStreams).values(
          cleaned.map((d) => ({
            userId,
            month,
            name: d.name,
            amount: d.amount.toString(),
            currency: d.currency,
          })),
        );
      }
    });
  } catch (err) {
    return {
      success: false,
      savedCount: 0,
      error: err instanceof Error ? err.message : "Save failed",
    };
  }

  revalidatePath("/");
  revalidatePath("/accounts");

  return { success: true, savedCount: cleaned.length };
}

/**
 * Income streams across every dashboard the current user can access, keyed by
 * month. Used by metrics/charts to sum income per month (in original currency;
 * callers convert to a display currency).
 */
export async function getAccessibleIncomeStreamsByMonth(): Promise<
  Map<string, Array<{ amount: number; currency: Currency }>>
> {
  const accessibleUserIds = await getAccessibleUserIds();
  if (accessibleUserIds.length === 0) return new Map();

  const rows = await db
    .select({
      month: incomeStreams.month,
      amount: incomeStreams.amount,
      currency: incomeStreams.currency,
    })
    .from(incomeStreams)
    .where(inArray(incomeStreams.userId, accessibleUserIds));

  const byMonth = new Map<string, Array<{ amount: number; currency: Currency }>>();
  for (const r of rows) {
    const arr = byMonth.get(r.month) ?? [];
    arr.push({
      amount: Number(r.amount),
      currency: (r.currency ?? "GBP") as Currency,
    });
    byMonth.set(r.month, arr);
  }
  return byMonth;
}
