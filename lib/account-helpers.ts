import type { AccountType, AccountCategory } from "./types";

/**
 * Friendly display labels for account types. The enum values stay in the DB;
 * users only ever see these.
 */
export const accountTypeLabels: Record<AccountType, string> = {
  Current: "Bank account",
  Savings: "Savings",
  Investment: "Investments",
  Stock: "Stocks",
  Crypto: "Crypto",
  Pension: "Pension",
  Commodity: "Commodities",
  Stock_options: "Stock options",
  Credit_Card: "Credit card",
  Loan: "Loan",
  Asset: "Property & assets",
};

export function getAccountTypeLabel(type: AccountType): string {
  return accountTypeLabels[type] ?? type.replace(/_/g, " ");
}

/** Liabilities subtract from net worth. */
export function isLiabilityType(type: AccountType): boolean {
  return type === "Credit_Card" || type === "Loan";
}

/**
 * The four buckets the mix module shows. Everything a user needs for an
 * allocation conversation, without eleven typed ledgers.
 */
export type MixBucket = "Cash" | "Invested" | "Property" | "Debt";

export const mixBuckets: MixBucket[] = ["Cash", "Invested", "Property", "Debt"];

export function getMixBucket(type: AccountType): MixBucket {
  switch (type) {
    case "Current":
    case "Savings":
      return "Cash";
    case "Credit_Card":
    case "Loan":
      return "Debt";
    case "Asset":
      return "Property";
    default:
      // Investment, Stock, Crypto, Pension, Commodity, Stock_options
      return "Invested";
  }
}

/**
 * Types you could realistically draw on within weeks. Pensions and physical
 * assets are wealth, not spending money.
 */
export function isLiquidType(type: AccountType): boolean {
  return (
    type === "Current" ||
    type === "Savings" ||
    type === "Investment" ||
    type === "Stock" ||
    type === "Crypto" ||
    type === "Commodity"
  );
}

/**
 * Determines if an account type should show the Income field.
 * Only Current accounts have earned income.
 */
export function shouldShowIncome(accountType: AccountType): boolean {
  return accountType === "Current";
}

/**
 * @deprecated Use shouldShowIncome instead. Kept for backward compatibility.
 */
export function shouldShowIncomeExpenditure(accountType: AccountType): boolean {
  return accountType === "Current";
}

/**
 * Returns user-friendly labels for the Contributions and Withdrawals fields
 * based on account type.
 */
export function getFieldLabels(accountType: AccountType): {
  contributionsLabel: string;
  withdrawalsLabel: string;
} {
  switch (accountType) {
    case "Current":
    case "Savings":
      return { contributionsLabel: "Deposits", withdrawalsLabel: "Withdrawals" };
    case "Credit_Card":
      return { contributionsLabel: "Payments Made", withdrawalsLabel: "New Charges" };
    case "Loan":
      return { contributionsLabel: "Payments Made", withdrawalsLabel: "New Drawdowns" };
    case "Asset":
      return { contributionsLabel: "Capital Invested", withdrawalsLabel: "Proceeds from Sale" };
    default:
      // Investment, Stock, Crypto, Commodity, Pension, Stock_options
      return { contributionsLabel: "Contributions", withdrawalsLabel: "Withdrawals" };
  }
}

/**
 * Auto-derives account category from account type.
 */
export function getCategoryFromType(accountType: AccountType): AccountCategory {
  switch (accountType) {
    case "Current":
    case "Savings":
    case "Credit_Card":
    case "Loan":
      return "Cash";
    default:
      return "Investments";
  }
}

/**
 * Auto-computes expenditure based on account type and cash flows.
 * - Current accounts: expenditure = withdrawals (cash_out)
 * - Credit Card: expenditure = new charges (cash_out)
 * - Others: 0
 */
export function computeExpenditure(accountType: AccountType, cashOut: number): number {
  if (accountType === "Current" || accountType === "Credit_Card") {
    return cashOut;
  }
  return 0;
}

