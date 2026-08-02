"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { refreshExchangeRatesForMonth } from "@/lib/fx-rates-server";
import { revalidatePath } from "next/cache";

export interface FxRateRow {
  id: string;
  /** Stored date, format "YYYY-MM-DD" (last day of month) */
  date: string;
  /** Derived month, format "YYYY-MM" */
  month: string;
  gbpRate: number;
  eurRate: number;
  usdRate: number;
  aedRate: number;
  updatedAt: string;
}

export interface FxRateInput {
  /** Month in "YYYY-MM" format */
  month: string;
  eurRate: number;
  usdRate: number;
  aedRate: number;
}

export interface FxRateMutationResult {
  success: boolean;
  error?: string;
}

/**
 * Returns the last calendar day of a month as "YYYY-MM-DD".
 * Kept in sync with lib/fx-rates-server.ts so stored rows share the same key.
 */
function getLastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNum, 0));
  return lastDay.toISOString().split("T")[0];
}

/** Derives the "YYYY-MM" month from a stored "YYYY-MM-DD" date string. */
function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

function isValidMonth(month: string): boolean {
  return /^\d{4}-\d{2}$/.test(month);
}

function isValidRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function toRow(row: typeof exchangeRates.$inferSelect): FxRateRow {
  return {
    id: row.id,
    date: row.date,
    month: monthFromDate(row.date),
    gbpRate: Number(row.gbpRate),
    eurRate: Number(row.eurRate),
    usdRate: Number(row.usdRate),
    aedRate: Number(row.aedRate),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Lists all stored exchange rates, newest month first. */
export async function getExchangeRateRows(): Promise<FxRateRow[]> {
  await getUserId();

  const rows = await db
    .select()
    .from(exchangeRates)
    .orderBy(desc(exchangeRates.date));

  return rows.map(toRow);
}

/**
 * Creates a new exchange rate for a month. Fails if a rate already exists for
 * that month (use updateExchangeRate to change an existing one).
 */
export async function createExchangeRate(
  input: FxRateInput,
): Promise<FxRateMutationResult> {
  await getUserId();

  if (!isValidMonth(input.month)) {
    return { success: false, error: "Invalid month. Expected YYYY-MM." };
  }
  if (
    !isValidRate(input.eurRate) ||
    !isValidRate(input.usdRate) ||
    !isValidRate(input.aedRate)
  ) {
    return { success: false, error: "Rates must be positive numbers." };
  }

  const dateStr = getLastDayOfMonth(input.month);

  const existing = await db
    .select({ id: exchangeRates.id })
    .from(exchangeRates)
    .where(eq(exchangeRates.date, dateStr))
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      error: "A rate already exists for this month. Edit it instead.",
    };
  }

  try {
    await db.insert(exchangeRates).values({
      date: dateStr,
      baseCurrency: "GBP",
      gbpRate: "1",
      eurRate: input.eurRate.toString(),
      usdRate: input.usdRate.toString(),
      aedRate: input.aedRate.toString(),
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create rate.",
    };
  }

  revalidatePaths();
  return { success: true };
}

/** Updates the rates for an existing exchange rate row (by id). */
export async function updateExchangeRate(
  id: string,
  input: Pick<FxRateInput, "eurRate" | "usdRate" | "aedRate">,
): Promise<FxRateMutationResult> {
  await getUserId();

  if (
    !isValidRate(input.eurRate) ||
    !isValidRate(input.usdRate) ||
    !isValidRate(input.aedRate)
  ) {
    return { success: false, error: "Rates must be positive numbers." };
  }

  try {
    const updated = await db
      .update(exchangeRates)
      .set({
        gbpRate: "1",
        eurRate: input.eurRate.toString(),
        usdRate: input.usdRate.toString(),
        aedRate: input.aedRate.toString(),
        updatedAt: new Date(),
      })
      .where(eq(exchangeRates.id, id))
      .returning({ id: exchangeRates.id });

    if (updated.length === 0) {
      return { success: false, error: "Rate not found." };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update rate.",
    };
  }

  revalidatePaths();
  return { success: true };
}

/** Deletes an exchange rate row by id. */
export async function deleteExchangeRate(
  id: string,
): Promise<FxRateMutationResult> {
  await getUserId();

  try {
    const deleted = await db
      .delete(exchangeRates)
      .where(eq(exchangeRates.id, id))
      .returning({ id: exchangeRates.id });

    if (deleted.length === 0) {
      return { success: false, error: "Rate not found." };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete rate.",
    };
  }

  revalidatePaths();
  return { success: true };
}

/**
 * Re-fetches rates for a month from the FX API and overwrites the stored value.
 * Used when the automatic update produced a wrong/missing value.
 */
export async function refreshExchangeRate(
  month: string,
): Promise<FxRateMutationResult> {
  await getUserId();

  if (!isValidMonth(month)) {
    return { success: false, error: "Invalid month. Expected YYYY-MM." };
  }

  const ok = await refreshExchangeRatesForMonth(month);
  if (!ok) {
    return {
      success: false,
      error:
        "Could not fetch rates from the provider for this month. Enter them manually instead.",
    };
  }

  revalidatePaths();
  return { success: true };
}

function revalidatePaths() {
  revalidatePath("/");
  revalidatePath("/fx-rates");
  revalidatePath("/data-health");
  revalidatePath("/accounts");
}
