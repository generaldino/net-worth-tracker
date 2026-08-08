"use server";

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";

export type Currency = "GBP" | "EUR" | "USD" | "AED";

export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  date?: string;
}


/**
 * Get the last day of a month from a YYYY-MM date string
 */
function getLastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  // Use Date.UTC to avoid timezone shifts
  const lastDay = new Date(Date.UTC(year, monthNum, 0));
  const result = lastDay.toISOString().split("T")[0];
  return result;
}

/**
 * Fetches exchange rates from database for a specific date (month)
 * Falls back to latest rates if date not found, then to API if needed
 */
export async function getExchangeRates(
  forDate?: string, // Format: "YYYY-MM" for monthly entries
): Promise<ExchangeRates> {
  try {
    let dateToUse: string | undefined;

    // If forDate is provided, get the last day of that month
    if (forDate) {
      dateToUse = getLastDayOfMonth(forDate);
    }

    // Try to get rates from database (exact match on calendar last day)
    if (dateToUse) {
      const storedRate = await db
        .select()
        .from(exchangeRates)
        .where(eq(exchangeRates.date, dateToUse))
        .limit(1);

      if (storedRate.length > 0) {
        const rate = storedRate[0];
        return {
          base: "GBP",
          rates: {
            GBP: Number(rate.gbpRate),
            EUR: Number(rate.eurRate),
            USD: Number(rate.usdRate),
            AED: Number(rate.aedRate),
          },
          date: rate.date,
        };
      }

      // Fallback: find any rate within the same month (handles trading-day dates)
      if (forDate) {
        const { like } = await import("drizzle-orm");
        const monthRate = await db
          .select()
          .from(exchangeRates)
          .where(like(exchangeRates.date, `${forDate}%`))
          .orderBy(desc(exchangeRates.date))
          .limit(1);

        if (monthRate.length > 0) {
          const rate = monthRate[0];
          return {
            base: "GBP",
            rates: {
              GBP: Number(rate.gbpRate),
              EUR: Number(rate.eurRate),
              USD: Number(rate.usdRate),
              AED: Number(rate.aedRate),
            },
            date: rate.date,
          };
        }
      }
    }

    // Fallback to latest stored rate
    const latestRate = await db
      .select()
      .from(exchangeRates)
      .orderBy(desc(exchangeRates.date))
      .limit(1);

    if (latestRate.length > 0) {
      const rate = latestRate[0];
      return {
        base: "GBP",
        rates: {
          GBP: Number(rate.gbpRate),
          EUR: Number(rate.eurRate),
          USD: Number(rate.usdRate),
          AED: Number(rate.aedRate),
        },
        date: rate.date,
      };
    }

  } catch {}
  // Silently fallback to 1:1 rates - this is expected when no rates are stored yet

  // Fallback to 1:1 rates if everything fails
  return {
    base: "GBP",
    rates: {
      GBP: 1,
      EUR: 1,
      USD: 1,
      AED: 1,
    },
  };
}

/**
 * Converts an amount from one currency to another
 * Server-side only function
 * @param forMonth - Optional month in "YYYY-MM" format to use historical rates
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  forMonth?: string, // Format: "YYYY-MM" for historical conversion
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates(forMonth);

  // Rates are stored as: 1 GBP = X EUR, 1 GBP = Y USD, etc.
  // To convert from EUR to GBP: divide by rates.rates.EUR
  // To convert from GBP to EUR: multiply by rates.rates.EUR

  // Convert to GBP first
  let amountInGbp: number;
  if (fromCurrency === "GBP") {
    amountInGbp = amount;
  } else {
    // If fromCurrency is EUR, and rates.rates.EUR = 1.15, then 1 EUR = 1/1.15 GBP
    amountInGbp = amount / rates.rates[fromCurrency];
  }

  // Convert from GBP to target currency
  let amountInTarget: number;
  if (toCurrency === "GBP") {
    amountInTarget = amountInGbp;
  } else {
    // If toCurrency is EUR, and rates.rates.EUR = 1.15, then 1 GBP = 1.15 EUR
    amountInTarget = amountInGbp * rates.rates[toCurrency];
  }

  return amountInTarget;
}
