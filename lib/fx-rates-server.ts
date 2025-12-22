"use server";

import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export type Currency = "GBP" | "EUR" | "USD" | "AED";

export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  date?: string;
}

const HEXARATE_API_URL = "https://api.hexarate.paikama.co/latest";

/**
 * Get the last day of a month from a YYYY-MM date string
 */
function getLastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNum, 0);
  return lastDay.toISOString().split("T")[0];
}

/**
 * Fetches exchange rates from database for a specific date (month)
 * Falls back to latest rates if date not found, then to API if needed
 */
export async function getExchangeRates(
  forDate?: string // Format: "YYYY-MM" for monthly entries
): Promise<ExchangeRates> {
  try {
    let dateToUse: string | undefined;

    // If forDate is provided, get the last day of that month
    if (forDate) {
      dateToUse = getLastDayOfMonth(forDate);
    }

    // Try to get rates from database
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

    // Final fallback: fetch from API (should rarely happen)
    console.warn("No stored rates found, fetching from API...");
    const response = await fetch(`${HEXARATE_API_URL}?base=GBP`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();
    const gbpRates = data.rates || {};

    return {
      base: "GBP",
      rates: {
        GBP: 1,
        EUR: gbpRates.EUR || 1,
        USD: gbpRates.USD || 1,
        AED: gbpRates.AED || 1,
      },
      date: data.date,
    };
  } catch (error) {
    console.error("Error fetching exchange rates:", error);

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
  forMonth?: string // Format: "YYYY-MM" for historical conversion
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

