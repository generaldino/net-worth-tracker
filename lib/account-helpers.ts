import type { AccountType } from "./types";

/**
 * Determines if an account type should have Income/Expenditure fields.
 * Only Current accounts should have these fields.
 */
export function shouldShowIncomeExpenditure(accountType: AccountType): boolean {
  return accountType === "Current";
}

