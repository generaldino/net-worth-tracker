import type { AccountType, AccountCategory } from "./types";

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

