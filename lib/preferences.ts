"use server";

import { cookies } from "next/headers";
import type { DisplayCurrency } from "@/components/currency-selector";

// Cookie names
const DISPLAY_CURRENCY_COOKIE = "displayCurrency";
const VALUE_MASKING_COOKIE = "valueMasking";

// Cookie options - 1 year expiry, secure in production
const COOKIE_OPTIONS = {
  httpOnly: false, // Need client access for reading
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: "/",
};

/**
 * Get user preferences from cookies (server-side)
 * Can be called from server components
 */
export async function getUserPreferences() {
  const cookieStore = await cookies();
  
  const displayCurrency = (cookieStore.get(DISPLAY_CURRENCY_COOKIE)?.value ?? "GBP") as DisplayCurrency;
  const isMasked = cookieStore.get(VALUE_MASKING_COOKIE)?.value !== "false"; // Default to masked (true)
  
  return {
    displayCurrency,
    isMasked,
  };
}

/**
 * Set display currency preference (server action)
 */
export async function setDisplayCurrencyPreference(currency: DisplayCurrency) {
  const cookieStore = await cookies();
  cookieStore.set(DISPLAY_CURRENCY_COOKIE, currency, COOKIE_OPTIONS);
}

/**
 * Set masking preference (server action)
 */
export async function setMaskingPreference(isMasked: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(VALUE_MASKING_COOKIE, String(isMasked), COOKIE_OPTIONS);
}

/**
 * Toggle masking preference (server action)
 * Returns the new value
 */
export async function toggleMaskingPreference(): Promise<boolean> {
  const cookieStore = await cookies();
  const currentValue = cookieStore.get(VALUE_MASKING_COOKIE)?.value !== "false";
  const newValue = !currentValue;
  cookieStore.set(VALUE_MASKING_COOKIE, String(newValue), COOKIE_OPTIONS);
  return newValue;
}
