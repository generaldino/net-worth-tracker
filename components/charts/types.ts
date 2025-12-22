export type ChartType =
  | "total"
  | "by-account"
  | "by-account-type"
  | "by-category"
  | "by-wealth-source"
  | "savings-rate";

export interface Account {
  id: string;
  name: string;
  type: string;
  isISA: boolean;
  owner: string;
  category?: string;
}

export interface SourceData {
  month: string;
  "Savings from Income": number;
  "Interest Earned": number;
  "Capital Gains": number;
  "Total Income"?: number;
  "Savings Rate": number;
  breakdown?: {
    "Savings from Income": Array<{
      accountId: string;
      name: string;
      type: string;
      amount: number;
      currency: string;
      owner: string;
    }>;
    "Interest Earned": Array<{
      accountId: string;
      name: string;
      type: string;
      amount: number;
      currency: string;
      owner: string;
    }>;
    "Capital Gains": Array<{
      accountId: string;
      name: string;
      type: string;
      amount: number;
      currency: string;
      owner: string;
    }>;
  };
}

export interface AccountData {
  month: string;
  [key: string]: number | string;
}

export interface ChartData {
  netWorthData: Array<{
    month: string;
    monthKey: string;
    netWorth: number;
    accountBalances?: Array<{
      accountId: string;
      balance: number;
      currency: string;
      isLiability: boolean;
    }>;
  }>;
  accountData: Array<AccountData & { monthKey: string }>;
  accountTypeData: Array<AccountData & { monthKey: string }>;
  categoryData: Array<AccountData & { monthKey: string }>;
  sourceData: Array<SourceData & { monthKey: string }>;
  accounts: Array<Account>;
}

export interface ClickedData {
  month: string;
  data: {
    month: string;
    netWorth?: number;
    [key: string]: number | string | undefined;
  };
  chartType: ChartType;
}
