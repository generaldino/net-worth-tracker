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
const HEXARATE_BASE_URL = "https://hexarate.paikama.co";

/**
 * Get the last day of a month from a YYYY-MM date string
 */
function getLastDayOfMonth(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  // Use Date.UTC to avoid timezone shifts
  const lastDay = new Date(Date.UTC(year, monthNum, 0));
  const result = lastDay.toISOString().split("T")[0];
  console.log("[DEBUG] getLastDayOfMonth -", month, "→", result, "(raw Date:", lastDay.toString(), ")");
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
        console.log("[DEBUG] getExchangeRates - found DB rate for", forDate, "→", dateToUse, "rates:", { EUR: rate.eurRate, USD: rate.usdRate, AED: rate.aedRate });
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
          console.log("[DEBUG] getExchangeRates - found DB rate by month prefix for", forDate, "→", rate.date, "rates:", { EUR: rate.eurRate, USD: rate.usdRate, AED: rate.aedRate });
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
      console.log("[DEBUG] getExchangeRates - FALLBACK to latest DB rate for", forDate, "→ using date:", rate.date, "rates:", { EUR: rate.eurRate, USD: rate.usdRate, AED: rate.aedRate });
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
    console.log("[DEBUG] getExchangeRates - FALLBACK to API for", forDate);
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
  } catch {}
  {
    // Silently fallback to 1:1 rates - this is expected when no rates are stored yet
    console.log("[DEBUG] getExchangeRates - ERROR FALLBACK to 1:1 rates for", forDate);

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

/**
 * Fetches a single currency pair rate for a specific date from HexaRate API
 * @param base - Base currency (e.g., "GBP")
 * @param target - Target currency (e.g., "EUR")
 * @param date - Date in "YYYY-MM-DD" format
 * @returns The exchange rate or null if failed
 */
async function fetchCurrencyPairRate(
  base: string,
  target: string,
  date: string,
): Promise<number | null> {
  try {
    const url = `${HEXARATE_BASE_URL}/api/rates/${base}/${target}/${date}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    // HexaRate returns: { status_code: 200, data: { base: "GBP", target: "EUR", mid: 1.15, ... } }
    const rate = data.data?.mid || data.mid || data.rate || null;
    return rate ? Number(rate) : null;
  } catch {
    return null;
  }
}

/**
 * Fetches and saves exchange rates for a specific month
 * @param month - Month in "YYYY-MM" format
 * @returns true if rates were successfully fetched and saved, false otherwise
 */
export async function fetchAndSaveExchangeRatesForMonth(
  month: string,
): Promise<boolean> {
  try {
    // Get the last day of the month
    const dateStr = getLastDayOfMonth(month);

    // Check if rate already exists
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.date, dateStr))
      .limit(1);

    if (existing.length > 0) {
      // Rate already exists, no need to fetch
      return true;
    }

    // Fetch rates for each currency pair
    const eurRate = await fetchCurrencyPairRate("GBP", "EUR", dateStr);
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));

    const usdRate = await fetchCurrencyPairRate("GBP", "USD", dateStr);
    await new Promise((resolve) => setTimeout(resolve, 300));

    const aedRate = await fetchCurrencyPairRate("GBP", "AED", dateStr);

    // Check if we got all required rates
    if (!eurRate || !usdRate || !aedRate) {
      return false;
    }

    // Insert the rates into the database
    await db.insert(exchangeRates).values({
      date: dateStr,
      baseCurrency: "GBP",
      gbpRate: "1",
      eurRate: eurRate.toString(),
      usdRate: usdRate.toString(),
      aedRate: aedRate.toString(),
    });

    console.log(
      `✓ Successfully fetched and saved FX rates for ${month} (${dateStr})`,
    );
    return true;
  } catch (error) {
    console.error(`Error fetching and saving FX rates for ${month}:`, error);
    return false;
  }
}
