import type { Account as DbAccount } from "@/db/schema";

export type Account = Pick<DbAccount, "id" | "name" | "type" | "isISA">;

export type AccountType = "current" | "savings" | "investment";

export const accountTypes: AccountType[] = ["current", "savings", "investment"];

export type MonthlyEntry = {
  accountId: string;
  monthKey: string;
  month: string;
  endingBalance: number;
  cashIn: number;
  cashOut: number;
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
