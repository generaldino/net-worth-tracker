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
  "Savings Rate": number;
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
