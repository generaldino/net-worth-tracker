import type { Account as DbAccount } from "@/db/schema";
import type { Currency } from "@/lib/fx-rates";

export type Account = Pick<
  DbAccount,
  | "id"
  | "name"
  | "type"
  | "isISA"
  | "owner"
  | "category"
  | "isClosed"
  | "closedAt"
  | "currency"
  | "displayOrder"
>;

export type AccountType =
  | "Current"
  | "Savings"
  | "Investment"
  | "Stock"
  | "Crypto"
  | "Pension"
  | "Commodity"
  | "Stock_options"
  | "Credit_Card"
  | "Loan";

export type AccountCategory = "Cash" | "Investments";

export const accountCategories: AccountCategory[] = ["Cash", "Investments"];

export const accountTypes: AccountType[] = [
  "Current",
  "Savings",
  "Investment",
  "Stock",
  "Crypto",
  "Pension",
  "Commodity",
  "Stock_options",
  "Credit_Card",
  "Loan",
];

export type MonthlyEntry = {
  accountId: string;
  monthKey: string;
  month: string;
  endingBalance: number;
  cashIn: number;
  cashOut: number;
  workIncome: number;
  cashFlow: number;
  accountGrowth: number;
};

export type MonthlyData = Record<string, MonthlyEntry[]>;

export type TimePeriod = "YTD" | "1Y" | "all";

export type ValueTimePeriod = "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL";

export const valueTimePeriods = [
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "6M", label: "6 Months" },
  { value: "1Y", label: "1 Year" },
  { value: "YTD", label: "Year to Date" },
  { value: "ALL", label: "All Time" },
] as const;

export const supportedCurrencies: Currency[] = ["GBP", "EUR", "USD", "AED"];

export const currencyLabels: Record<Currency, string> = {
  GBP: "British Pound (GBP)",
  EUR: "Euro (EUR)",
  USD: "US Dollar (USD)",
  AED: "UAE Dirham (AED)",
};
