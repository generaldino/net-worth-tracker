export type ChartType =
  | "total"
  | "by-account"
  | "by-account-type"
  | "by-category"
  | "by-wealth-source";

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
}

export interface AccountData {
  month: string;
  [key: string]: number | string;
}

export interface ChartData {
  netWorthData: Array<{ month: string; netWorth: number }>;
  accountData: Array<AccountData>;
  accountTypeData: Array<AccountData>;
  categoryData: Array<AccountData>;
  sourceData: Array<SourceData>;
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
