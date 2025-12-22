export type Currency = "GBP" | "EUR" | "USD" | "AED";

export interface ExchangeRates {
  base: Currency;
  rates: Record<Currency, number>;
  date?: string;
}

const HEXARATE_API_URL = "https://api.hexarate.paikama.co/latest";

// Cache for exchange rates (refresh daily)
let cachedRates: ExchangeRates | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetches exchange rates from HexaRate API
 * Uses caching to avoid excessive API calls
 */
export async function getExchangeRates(
  baseCurrency: Currency = "GBP"
): Promise<ExchangeRates> {
  const now = Date.now();

  // Return cached rates if still valid
  if (
    cachedRates &&
    cachedRates.base === baseCurrency &&
    now - cacheTimestamp < CACHE_DURATION
  ) {
    return cachedRates;
  }

  try {
    // Always fetch with GBP as base to normalize all rates
    const response = await fetch(`${HEXARATE_API_URL}?base=GBP`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`);
    }

    const data = await response.json();

    // HexaRate returns rates in format: { base: "GBP", rates: { EUR: 1.15, USD: 1.27, ... } }
    // This means 1 GBP = 1.15 EUR, 1 GBP = 1.27 USD, etc.
    // We normalize all rates relative to GBP
    const gbpRates = data.rates || {};
    
    const rates: ExchangeRates = {
      base: "GBP",
      rates: {
        GBP: 1,
        EUR: gbpRates.EUR || 1,
        USD: gbpRates.USD || 1,
        AED: gbpRates.AED || 1,
      },
      date: data.date,
    };

    // Update cache
    cachedRates = rates;
    cacheTimestamp = now;

    return rates;
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    
    // Return cached rates as fallback if available
    if (cachedRates) {
      return cachedRates;
    }

    // Fallback to 1:1 rates if no cache and API fails
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
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): Promise<number> {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const rates = await getExchangeRates("GBP");
  
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
 * Gets the currency symbol for display
 */
export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    GBP: "£",
    EUR: "€",
    USD: "$",
    AED: "د.إ",
  };
  return symbols[currency];
}

/**
 * Formats a number as currency
 */
export function formatCurrencyAmount(
  amount: number,
  currency: Currency,
  options?: Intl.NumberFormatOptions
): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);

  // For AED, symbol comes after
  if (currency === "AED") {
    return `${formatted} ${symbol}`;
  }
  
  return `${symbol}${formatted}`;
}

