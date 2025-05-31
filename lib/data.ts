import type {
  Account as DbAccount,
  MonthlyEntry as DbMonthlyEntry,
} from "@/db/schema";

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

export const accounts: Account[] = [
  { id: "1", name: "Barclays Current", type: "current", isISA: false },
  { id: "2", name: "Marcus Savings", type: "savings", isISA: false },
  { id: "3", name: "Vanguard S&S ISA", type: "investment", isISA: true },
  { id: "4", name: "Pension (SIPP)", type: "investment", isISA: false },
];

export const monthlyData: MonthlyData = {
  "2024-01": [
    {
      accountId: "1",
      monthKey: "2024-01",
      month: "2024-01",
      endingBalance: 3200,
      cashIn: 4500,
      cashOut: 3800,
      cashFlow: 700,
      accountGrowth: 320,
    },
    {
      accountId: "2",
      monthKey: "2024-01",
      month: "2024-01",
      endingBalance: 15200,
      cashIn: 2000,
      cashOut: 1800,
      cashFlow: 200,
      accountGrowth: 14200,
    },
    {
      accountId: "3",
      monthKey: "2024-01",
      month: "2024-01",
      endingBalance: 26500,
      cashIn: 1000,
      cashOut: 0,
      cashFlow: 1000,
      accountGrowth: 25500,
    },
    {
      accountId: "4",
      monthKey: "2024-01",
      month: "2024-01",
      endingBalance: 46800,
      cashIn: 800,
      cashOut: 0,
      cashFlow: 800,
      accountGrowth: 46000,
    },
  ],
  "2024-02": [
    {
      accountId: "1",
      monthKey: "2024-02",
      month: "2024-02",
      endingBalance: 2800,
      cashIn: 4500,
      cashOut: 4900,
      cashFlow: -400,
      accountGrowth: -100,
    },
    {
      accountId: "2",
      monthKey: "2024-02",
      month: "2024-02",
      endingBalance: 17275,
      cashIn: 2000,
      cashOut: 0,
      cashFlow: 2000,
      accountGrowth: 17275,
    },
    {
      accountId: "3",
      monthKey: "2024-02",
      month: "2024-02",
      endingBalance: 25900,
      cashIn: 1000,
      cashOut: 0,
      cashFlow: 1000,
      accountGrowth: 24900,
    },
    {
      accountId: "4",
      monthKey: "2024-02",
      month: "2024-02",
      endingBalance: 48200,
      cashIn: 800,
      cashOut: 0,
      cashFlow: 800,
      accountGrowth: 47400,
    },
  ],
  "2024-03": [
    {
      accountId: "1",
      monthKey: "2024-03",
      month: "2024-03",
      endingBalance: 3500,
      cashIn: 4500,
      cashOut: 3800,
      cashFlow: 700,
      accountGrowth: 500,
    },
    {
      accountId: "2",
      monthKey: "2024-03",
      month: "2024-03",
      endingBalance: 19425,
      cashIn: 2100,
      cashOut: 0,
      cashFlow: 2100,
      accountGrowth: 19425,
    },
    {
      accountId: "3",
      monthKey: "2024-03",
      month: "2024-03",
      endingBalance: 27200,
      cashIn: 1000,
      cashOut: 0,
      cashFlow: 1000,
      accountGrowth: 26200,
    },
    {
      accountId: "4",
      monthKey: "2024-03",
      month: "2024-03",
      endingBalance: 50100,
      cashIn: 800,
      cashOut: 0,
      cashFlow: 800,
      accountGrowth: 49300,
    },
  ],
  "2024-04": [
    {
      accountId: "1",
      monthKey: "2024-04",
      month: "2024-04",
      endingBalance: 2900,
      cashIn: 4500,
      cashOut: 5100,
      cashFlow: -600,
      accountGrowth: -1200,
    },
    {
      accountId: "2",
      monthKey: "2024-04",
      month: "2024-04",
      endingBalance: 21650,
      cashIn: 2200,
      cashOut: 0,
      cashFlow: 2200,
      accountGrowth: 21650,
    },
    {
      accountId: "3",
      monthKey: "2024-04",
      month: "2024-04",
      endingBalance: 28800,
      cashIn: 1000,
      cashOut: 0,
      cashFlow: 1000,
      accountGrowth: 27800,
    },
    {
      accountId: "4",
      monthKey: "2024-04",
      month: "2024-04",
      endingBalance: 51500,
      cashIn: 800,
      cashOut: 0,
      cashFlow: 800,
      accountGrowth: 50700,
    },
  ],
  "2024-05": [
    {
      accountId: "1",
      monthKey: "2024-05",
      month: "2024-05",
      endingBalance: 3800,
      cashIn: 4500,
      cashOut: 3600,
      cashFlow: 900,
      accountGrowth: 200,
    },
    {
      accountId: "2",
      monthKey: "2024-05",
      month: "2024-05",
      endingBalance: 23975,
      cashIn: 2300,
      cashOut: 0,
      cashFlow: 2300,
      accountGrowth: 23975,
    },
    {
      accountId: "3",
      monthKey: "2024-05",
      month: "2024-05",
      endingBalance: 30500,
      cashIn: 1000,
      cashOut: 0,
      cashFlow: 1000,
      accountGrowth: 29500,
    },
    {
      accountId: "4",
      monthKey: "2024-05",
      month: "2024-05",
      endingBalance: 53800,
      cashIn: 800,
      cashOut: 0,
      cashFlow: 800,
      accountGrowth: 53000,
    },
  ],
  "2024-06": [
    {
      accountId: "1",
      monthKey: "2024-06",
      month: "2024-06",
      endingBalance: 3200,
      cashIn: 4500,
      cashOut: 5100,
      cashFlow: -1900,
      accountGrowth: -2000,
    },
    {
      accountId: "2",
      monthKey: "2024-06",
      month: "2024-06",
      endingBalance: 26150,
      cashIn: 2100,
      cashOut: 0,
      cashFlow: 2100,
      accountGrowth: 26150,
    },
    {
      accountId: "3",
      monthKey: "2024-06",
      month: "2024-06",
      endingBalance: 29800,
      cashIn: 1000,
      cashOut: 0,
      cashFlow: 1000,
      accountGrowth: 28800,
    },
    {
      accountId: "4",
      monthKey: "2024-06",
      month: "2024-06",
      endingBalance: 55200,
      cashIn: 800,
      cashOut: 0,
      cashFlow: 800,
      accountGrowth: 54400,
    },
  ],
};

// Helper functions for calculations
export function getPreviousBalance(accountId: string, month: string): number {
  const months = Object.keys(monthlyData).sort();
  const currentIndex = months.indexOf(month);

  if (currentIndex <= 0) {
    // First month, return 0 as we don't track opening balances
    return 0;
  }

  const previousMonth = months[currentIndex - 1];
  const previousEntry = monthlyData[previousMonth]?.find(
    (e) => e.accountId === accountId
  );
  return previousEntry ? previousEntry.endingBalance : 0;
}

export function calculateCashFlow(entry: MonthlyEntry): number {
  return entry.cashIn - entry.cashOut;
}

export function calculateNetChange(
  accountId: string,
  month: string,
  endingBalance: number
): number {
  const previousBalance = getPreviousBalance(accountId, month);
  return endingBalance - previousBalance;
}

export function calculateAccountGrowth(
  accountId: string,
  month: string,
  entry: MonthlyEntry
): number {
  const netChange = calculateNetChange(accountId, month, entry.endingBalance);
  const cashFlow = calculateCashFlow(entry);
  return netChange - cashFlow;
}

export function getCurrentValue(
  accountId: string,
  monthlyData: MonthlyData
): number {
  // Get the latest month's data for this account
  const months = Object.keys(monthlyData).sort().reverse();
  if (months.length === 0) return 0;

  const latestMonth = months[0];
  const latestEntry = monthlyData[latestMonth].find(
    (entry) => entry.accountId === accountId
  );

  return latestEntry?.endingBalance || 0;
}

export function getFilteredMonths(timePeriod: TimePeriod): string[] {
  const allMonths = Object.keys(monthlyData).sort();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  switch (timePeriod) {
    case "YTD":
      return allMonths.filter((month) =>
        month.startsWith(currentYear.toString())
      );
    case "1Y":
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(currentYear - 1);
      return allMonths.filter((month) => new Date(month + "-01") >= oneYearAgo);
    case "all":
    default:
      return allMonths;
  }
}

export function getNetWorthOverTime(
  timePeriod: TimePeriod = "all"
): Array<{ month: string; netWorth: number }> {
  const months = getFilteredMonths(timePeriod);
  return months.map((month) => ({
    month: new Date(month + "-01").toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    }),
    netWorth: monthlyData[month].reduce(
      (sum, entry) => sum + entry.endingBalance,
      0
    ),
  }));
}

export function getNetWorthByAccountOverTime(
  timePeriod: TimePeriod = "all"
): Array<any> {
  const months = getFilteredMonths(timePeriod);
  return months.map((month) => {
    const monthData: any = {
      month: new Date(month + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
    };

    monthlyData[month].forEach((entry) => {
      const account = accounts.find((a) => a.id === entry.accountId);
      if (account) {
        monthData[account.name] = entry.endingBalance;
      }
    });

    return monthData;
  });
}

export function getGrowthBySourceOverTime(
  timePeriod: TimePeriod = "all"
): Array<any> {
  const months = getFilteredMonths(timePeriod);

  return months.map((month) => {
    let savingsFromIncome = 0;
    let interestEarned = 0;
    let capitalGains = 0;

    monthlyData[month].forEach((entry) => {
      const account = accounts.find((a) => a.id === entry.accountId);
      if (!account) return;

      const accountGrowth = calculateAccountGrowth(
        entry.accountId,
        month,
        entry
      );

      switch (account.type) {
        case "current":
          savingsFromIncome += accountGrowth;
          break;
        case "savings":
          interestEarned += accountGrowth;
          break;
        case "investment":
          capitalGains += accountGrowth;
          break;
      }
    });

    return {
      month: new Date(month + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      "Savings from Income": Math.max(0, savingsFromIncome),
      "Interest Earned": Math.max(0, interestEarned),
      "Capital Gains": capitalGains, // Can be negative
    };
  });
}

export function getAccountHistory(
  accountId: string,
  monthlyData: MonthlyData
): MonthlyEntry[] {
  // Get all entries for this account, sorted by month
  const allEntries: MonthlyEntry[] = [];
  Object.entries(monthlyData).forEach(([month, entries]) => {
    const entry = entries.find((e: MonthlyEntry) => e.accountId === accountId);
    if (entry) {
      allEntries.push(entry);
    }
  });

  return allEntries.sort((a, b) => b.month.localeCompare(a.month));
}

export function getMonthlyTotals(month: string) {
  const entries = monthlyData[month] || [];

  let totalCashIn = 0;
  let totalCashOut = 0;
  let totalSavingsFromIncome = 0;
  let totalInterestEarned = 0;
  let totalCapitalGains = 0;

  entries.forEach((entry) => {
    const account = accounts.find((a) => a.id === entry.accountId);
    if (!account) return;

    totalCashIn += entry.cashIn;
    totalCashOut += entry.cashOut;

    const accountGrowth = calculateAccountGrowth(entry.accountId, month, entry);

    switch (account.type) {
      case "current":
        totalSavingsFromIncome += accountGrowth;
        break;
      case "savings":
        totalInterestEarned += accountGrowth;
        break;
      case "investment":
        totalCapitalGains += accountGrowth;
        break;
    }
  });

  return {
    totalCashIn,
    totalCashOut,
    totalCashFlow: totalCashIn - totalCashOut,
    totalSavingsFromIncome,
    totalInterestEarned,
    totalCapitalGains,
    totalGrowth:
      totalSavingsFromIncome + totalInterestEarned + totalCapitalGains,
  };
}

export type ValueTimePeriod = "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL";

export const valueTimePeriods = [
  { value: "1M", label: "1 Month" },
  { value: "3M", label: "3 Months" },
  { value: "6M", label: "6 Months" },
  { value: "1Y", label: "1 Year" },
  { value: "YTD", label: "Year to Date" },
  { value: "ALL", label: "All Time" },
] as const;

export function getValueAtPeriod(
  accountId: string,
  timePeriod: ValueTimePeriod
): number {
  const months = Object.keys(monthlyData).sort();
  const currentDate = new Date();

  if (months.length === 0) return 0;

  let targetDate: Date;

  switch (timePeriod) {
    case "1M":
      targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );
      break;
    case "3M":
      targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 3,
        1
      );
      break;
    case "6M":
      targetDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 6,
        1
      );
      break;
    case "1Y":
      targetDate = new Date(
        currentDate.getFullYear() - 1,
        currentDate.getMonth(),
        1
      );
      break;
    case "YTD":
      targetDate = new Date(currentDate.getFullYear(), 0, 1); // January 1st of current year
      break;
    case "ALL":
      // Return the first available value or 0
      const firstMonth = months[0];
      const firstEntry = monthlyData[firstMonth]?.find(
        (e) => e.accountId === accountId
      );
      return firstEntry ? firstEntry.endingBalance : 0;
    default:
      return 0;
  }

  // Find the closest month to the target date
  const targetMonthKey = `${targetDate.getFullYear()}-${String(
    targetDate.getMonth() + 1
  ).padStart(2, "0")}`;

  // If exact month exists, use it
  if (monthlyData[targetMonthKey]) {
    const entry = monthlyData[targetMonthKey].find(
      (e) => e.accountId === accountId
    );
    return entry ? entry.endingBalance : 0;
  }

  // Otherwise, find the closest available month at or before the target
  const availableMonths = months.filter((month) => month <= targetMonthKey);
  if (availableMonths.length === 0) return 0;

  const closestMonth = availableMonths[availableMonths.length - 1];
  const entry = monthlyData[closestMonth]?.find(
    (e) => e.accountId === accountId
  );
  return entry ? entry.endingBalance : 0;
}

export function calculateValueChange(
  accountId: string,
  timePeriod: ValueTimePeriod,
  monthlyData: MonthlyData
): { absoluteChange: number; percentageChange: number } {
  const history = getAccountHistory(accountId, monthlyData);
  if (history.length === 0) {
    return { absoluteChange: 0, percentageChange: 0 };
  }

  const currentValue = history[0].endingBalance;
  let previousValue: number;

  switch (timePeriod) {
    case "1M":
      previousValue = history[1]?.endingBalance || 0;
      break;
    case "3M":
      previousValue = history[3]?.endingBalance || 0;
      break;
    case "6M":
      previousValue = history[6]?.endingBalance || 0;
      break;
    case "1Y":
      previousValue = history[12]?.endingBalance || 0;
      break;
    case "YTD":
      const currentYear = new Date().getFullYear();
      const ytdEntry = history.find((entry) =>
        entry.month.startsWith(`${currentYear}-01`)
      );
      previousValue = ytdEntry?.endingBalance || 0;
      break;
    case "ALL":
    default:
      previousValue = history[history.length - 1]?.endingBalance || 0;
  }

  const absoluteChange = currentValue - previousValue;
  const percentageChange =
    previousValue === 0 ? 0 : (absoluteChange / previousValue) * 100;

  return { absoluteChange, percentageChange };
}
