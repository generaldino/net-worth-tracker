export type ChartType = "total" | "accounts" | "sources";

export interface Account {
  id: string;
  name: string;
  type: string;
  isISA: boolean;
  owner: string;
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
  sourceData: Array<SourceData>;
  accounts: Array<Account>;
}

export interface ClickedData {
  month: string;
  data: any;
  chartType: ChartType;
}
