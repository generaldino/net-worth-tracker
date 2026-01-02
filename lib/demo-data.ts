import type { Account, MonthlyEntry, AccountType } from "@/lib/types";

// Generate month keys for the last 24 months
function generateMonthKeys(count: number): string[] {
  const months: string[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    months.push(`${year}-${month}`);
  }

  return months;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

// Demo accounts
export const demoAccounts: Account[] = [
  {
    id: "demo-current-1",
    name: "Main Current Account",
    type: "Current" as AccountType,
    isISA: false,
    owner: "Demo User",
    category: "Cash",
    isClosed: false,
    closedAt: null,
    currency: "GBP",
    displayOrder: 0,
  },
  {
    id: "demo-savings-1",
    name: "Emergency Fund",
    type: "Savings" as AccountType,
    isISA: false,
    owner: "Demo User",
    category: "Cash",
    isClosed: false,
    closedAt: null,
    currency: "GBP",
    displayOrder: 1,
  },
  {
    id: "demo-isa-1",
    name: "Stocks & Shares ISA",
    type: "Stock" as AccountType,
    isISA: true,
    owner: "Demo User",
    category: "Investments",
    isClosed: false,
    closedAt: null,
    currency: "GBP",
    displayOrder: 2,
  },
  {
    id: "demo-pension-1",
    name: "Workplace Pension",
    type: "Pension" as AccountType,
    isISA: false,
    owner: "Demo User",
    category: "Investments",
    isClosed: false,
    closedAt: null,
    currency: "GBP",
    displayOrder: 3,
  },
  {
    id: "demo-crypto-1",
    name: "Crypto Portfolio",
    type: "Crypto" as AccountType,
    isISA: false,
    owner: "Demo User",
    category: "Investments",
    isClosed: false,
    closedAt: null,
    currency: "USD",
    displayOrder: 4,
  },
  {
    id: "demo-savings-2",
    name: "Holiday Fund",
    type: "Savings" as AccountType,
    isISA: true,
    owner: "Demo User",
    category: "Cash",
    isClosed: false,
    closedAt: null,
    currency: "GBP",
    displayOrder: 5,
  },
  {
    id: "demo-credit-1",
    name: "Credit Card",
    type: "Credit_Card" as AccountType,
    isISA: false,
    owner: "Demo User",
    category: "Cash",
    isClosed: false,
    closedAt: null,
    currency: "GBP",
    displayOrder: 6,
  },
  {
    id: "demo-loan-1",
    name: "Car Loan",
    type: "Loan" as AccountType,
    isISA: false,
    owner: "Demo User",
    category: "Cash",
    isClosed: false,
    closedAt: null,
    currency: "GBP",
    displayOrder: 7,
  },
];

// Generate realistic demo monthly entries
function generateDemoEntries(): Record<string, MonthlyEntry[]> {
  const monthKeys = generateMonthKeys(24);
  const entries: Record<string, MonthlyEntry[]> = {};

  // Base values and growth patterns for each account
  const accountPatterns: Record<
    string,
    {
      baseBalance: number;
      monthlyGrowth: number;
      volatility: number;
      cashInBase: number;
      cashOutBase: number;
      incomeBase: number;
    }
  > = {
    "demo-current-1": {
      baseBalance: 8500,
      monthlyGrowth: 50,
      volatility: 2000,
      cashInBase: 5500,
      cashOutBase: 4800,
      incomeBase: 5200,
    },
    "demo-savings-1": {
      baseBalance: 15000,
      monthlyGrowth: 400,
      volatility: 500,
      cashInBase: 500,
      cashOutBase: 100,
      incomeBase: 20,
    },
    "demo-isa-1": {
      baseBalance: 45000,
      monthlyGrowth: 800,
      volatility: 3000,
      cashInBase: 500,
      cashOutBase: 0,
      incomeBase: 0,
    },
    "demo-pension-1": {
      baseBalance: 85000,
      monthlyGrowth: 1200,
      volatility: 5000,
      cashInBase: 800,
      cashOutBase: 0,
      incomeBase: 0,
    },
    "demo-crypto-1": {
      baseBalance: 12000,
      monthlyGrowth: 200,
      volatility: 4000,
      cashInBase: 200,
      cashOutBase: 0,
      incomeBase: 0,
    },
    "demo-savings-2": {
      baseBalance: 3000,
      monthlyGrowth: 150,
      volatility: 200,
      cashInBase: 200,
      cashOutBase: 50,
      incomeBase: 5,
    },
    "demo-credit-1": {
      baseBalance: -1200,
      monthlyGrowth: 20,
      volatility: 800,
      cashInBase: 1500,
      cashOutBase: 1600,
      incomeBase: 0,
    },
    "demo-loan-1": {
      baseBalance: -8500,
      monthlyGrowth: 350,
      volatility: 0,
      cashInBase: 350,
      cashOutBase: 0,
      incomeBase: 0,
    },
  };

  // Seed for consistent random numbers
  let seed = 42;
  function seededRandom() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff) * 2 - 1; // Returns -1 to 1
  }

  demoAccounts.forEach((account) => {
    const pattern = accountPatterns[account.id];
    if (!pattern) return;

    let currentBalance = pattern.baseBalance;

    monthKeys.forEach((monthKey, index) => {
      // Add some randomness based on volatility
      const randomFactor = seededRandom() * pattern.volatility;
      const seasonalFactor =
        Math.sin((index / 12) * Math.PI * 2) * (pattern.volatility * 0.3);

      // Calculate values with some variation
      const cashIn =
        pattern.cashInBase +
        Math.floor(seededRandom() * pattern.cashInBase * 0.3);
      const cashOut =
        pattern.cashOutBase +
        Math.floor(seededRandom() * pattern.cashOutBase * 0.3);
      const income =
        pattern.incomeBase +
        Math.floor(seededRandom() * pattern.incomeBase * 0.1);
      const cashFlow = cashIn - cashOut;

      // Calculate account growth (market gains/losses for investments)
      const baseGrowth = pattern.monthlyGrowth + randomFactor + seasonalFactor;
      const accountGrowth = Math.round(baseGrowth - cashFlow);

      // Update balance
      currentBalance = currentBalance + cashFlow + accountGrowth;

      // Create entry
      const entry: MonthlyEntry = {
        accountId: account.id,
        monthKey,
        month: formatMonth(monthKey),
        endingBalance: Math.round(currentBalance),
        cashIn: Math.max(0, cashIn),
        cashOut: Math.max(0, cashOut),
        income: Math.max(0, income),
        expenditure: Math.max(0, cashOut - (cashIn - income)),
        cashFlow,
        accountGrowth: Math.round(accountGrowth),
      };

      if (!entries[monthKey]) {
        entries[monthKey] = [];
      }
      entries[monthKey].push(entry);
    });
  });

  return entries;
}

// Generate the demo data once
export const demoMonthlyData = generateDemoEntries();

// Calculate demo net worth
export function calculateDemoNetWorth(): number {
  const monthKeys = Object.keys(demoMonthlyData).sort();
  
  if (monthKeys.length === 0) {
    return 0;
  }
  
  const latestMonth = monthKeys[monthKeys.length - 1];
  const entries = demoMonthlyData[latestMonth] || [];

  return entries.reduce((total, entry) => total + entry.endingBalance, 0);
}

// Get demo net worth breakdown
export function getDemoNetWorthBreakdown() {
  const monthKeys = Object.keys(demoMonthlyData).sort();
  const latestMonth = monthKeys[monthKeys.length - 1];
  const entries = demoMonthlyData[latestMonth] || [];

  return {
    accountBalances: entries.map((entry) => {
      const account = demoAccounts.find((a) => a.id === entry.accountId);
      return {
        accountId: entry.accountId,
        balance: entry.endingBalance,
        currency: account?.currency || "GBP",
        isLiability:
          account?.type === "Credit_Card" || account?.type === "Loan",
      };
    }),
    monthKey: latestMonth,
  };
}

// Calculate demo percentage increase
export function getDemoPercentageIncrease(): number {
  const monthKeys = Object.keys(demoMonthlyData).sort();
  const firstMonth = monthKeys[0];
  const latestMonth = monthKeys[monthKeys.length - 1];

  const firstEntries = demoMonthlyData[firstMonth] || [];
  const latestEntries = demoMonthlyData[latestMonth] || [];

  const firstNetWorth = firstEntries.reduce(
    (total, entry) => total + entry.endingBalance,
    0
  );
  const latestNetWorth = latestEntries.reduce(
    (total, entry) => total + entry.endingBalance,
    0
  );

  if (firstNetWorth === 0) return 0;
  return ((latestNetWorth - firstNetWorth) / Math.abs(firstNetWorth)) * 100;
}

// Get demo financial metrics
export function getDemoFinancialMetrics() {
  const monthKeys = Object.keys(demoMonthlyData).sort();
  const currentYear = new Date().getFullYear();
  const ytdMonths = monthKeys.filter((key) =>
    key.startsWith(currentYear.toString())
  );
  const latestMonth = monthKeys[monthKeys.length - 1];

  // Calculate totals
  let incomeYTD = 0;
  let incomeAllTime = 0;
  let expenditureYTD = 0;
  let expenditureAllTime = 0;

  monthKeys.forEach((monthKey) => {
    const entries = demoMonthlyData[monthKey];
    entries.forEach((entry) => {
      incomeAllTime += entry.income;
      expenditureAllTime += Math.max(0, entry.cashOut - entry.income);

      if (ytdMonths.includes(monthKey)) {
        incomeYTD += entry.income;
        expenditureYTD += Math.max(0, entry.cashOut - entry.income);
      }
    });
  });

  const savingsYTD = incomeYTD - expenditureYTD;
  const savingsAllTime = incomeAllTime - expenditureAllTime;

  // Net worth calculations
  const firstEntries = demoMonthlyData[monthKeys[0]] || [];
  const latestEntries = demoMonthlyData[latestMonth] || [];
  const ytdFirstMonth = ytdMonths[0];
  const ytdFirstEntries = ytdFirstMonth
    ? demoMonthlyData[ytdFirstMonth] || []
    : [];

  const firstNetWorth = firstEntries.reduce(
    (total, entry) => total + entry.endingBalance,
    0
  );
  const latestNetWorth = latestEntries.reduce(
    (total, entry) => total + entry.endingBalance,
    0
  );
  const ytdStartNetWorth = ytdFirstEntries.reduce(
    (total, entry) => total + entry.endingBalance,
    0
  );

  // Calculate YTD and All Time change percentages
  const ytdChange = latestNetWorth - ytdStartNetWorth;
  const allTimeChange = latestNetWorth - firstNetWorth;
  
  return {
    // netWorthYTD is the TOTAL net worth (used for display), percentages show the change
    netWorthYTD: latestNetWorth,
    netWorthAllTime: latestNetWorth,
    netWorthPercentageYTD:
      ytdStartNetWorth !== 0
        ? (ytdChange / Math.abs(ytdStartNetWorth)) * 100
        : null,
    netWorthPercentageAllTime:
      firstNetWorth !== 0
        ? (allTimeChange / Math.abs(firstNetWorth)) * 100
        : null,
    incomeYTD,
    incomeAllTime,
    incomePercentageYTD: null,
    incomePercentageAllTime: null,
    expenditureYTD,
    expenditureAllTime,
    expenditurePercentageYTD: null,
    expenditurePercentageAllTime: null,
    savingsYTD,
    savingsAllTime,
    savingsPercentageYTD: null,
    savingsPercentageAllTime: null,
    savingsRateYTD: incomeYTD > 0 ? (savingsYTD / incomeYTD) * 100 : null,
    savingsRateAllTime:
      incomeAllTime > 0 ? (savingsAllTime / incomeAllTime) * 100 : null,
    spendingRateYTD:
      incomeYTD > 0 ? (expenditureYTD / incomeYTD) * 100 : null,
    spendingRateAllTime:
      incomeAllTime > 0 ? (expenditureAllTime / incomeAllTime) * 100 : null,
    incomeBreakdownYTD: [{ currency: "GBP", amount: incomeYTD }],
    incomeBreakdownAllTime: [{ currency: "GBP", amount: incomeAllTime }],
    expenditureBreakdownYTD: [{ currency: "GBP", amount: expenditureYTD }],
    expenditureBreakdownAllTime: [
      { currency: "GBP", amount: expenditureAllTime },
    ],
    latestMonth,
  };
}

// Get all available months for demo
export function getDemoMonthKeys(): string[] {
  return Object.keys(demoMonthlyData).sort();
}

// Generate demo chart data
export function getDemoChartData() {
  const monthKeys = Object.keys(demoMonthlyData).sort();

  // Net worth data
  const netWorthData = monthKeys.map((monthKey) => {
    const entries = demoMonthlyData[monthKey];
    const netWorth = entries.reduce(
      (total, entry) => total + entry.endingBalance,
      0
    );
    const accountBalances = entries.map((entry) => {
      const account = demoAccounts.find((a) => a.id === entry.accountId);
      return {
        accountId: entry.accountId,
        balance: entry.endingBalance,
        currency: account?.currency || "GBP",
        isLiability:
          account?.type === "Credit_Card" || account?.type === "Loan",
      };
    });

    return {
      month: formatMonth(monthKey),
      monthKey,
      netWorth,
      accountBalances,
    };
  });

  // Account data (by individual account)
  const accountData = monthKeys.map((monthKey) => {
    const entries = demoMonthlyData[monthKey];
    const data: Record<string, number | string> = {
      month: formatMonth(monthKey),
      monthKey,
    };
    entries.forEach((entry) => {
      const account = demoAccounts.find((a) => a.id === entry.accountId);
      if (account) {
        data[account.name] = entry.endingBalance;
      }
    });
    return data;
  });

  // Account type data
  const accountTypeData = monthKeys.map((monthKey) => {
    const entries = demoMonthlyData[monthKey];
    const typeBalances: Record<string, number> = {};

    entries.forEach((entry) => {
      const account = demoAccounts.find((a) => a.id === entry.accountId);
      if (account) {
        const type = account.type;
        typeBalances[type] = (typeBalances[type] || 0) + entry.endingBalance;
      }
    });

    return {
      month: formatMonth(monthKey),
      monthKey,
      ...typeBalances,
    };
  });

  // Category data
  const categoryData = monthKeys.map((monthKey) => {
    const entries = demoMonthlyData[monthKey];
    const categoryBalances: Record<string, number> = {};

    entries.forEach((entry) => {
      const account = demoAccounts.find((a) => a.id === entry.accountId);
      if (account) {
        const category = account.category || "Other";
        categoryBalances[category] =
          (categoryBalances[category] || 0) + entry.endingBalance;
      }
    });

    return {
      month: formatMonth(monthKey),
      monthKey,
      ...categoryBalances,
    };
  });

  // Source data (wealth growth sources)
  const sourceData = monthKeys.map((monthKey, index) => {
    const entries = demoMonthlyData[monthKey];

    let savingsFromIncome = 0;
    let interestEarned = 0;
    let capitalGains = 0;
    let totalIncome = 0;
    let totalExpenditure = 0;

    entries.forEach((entry) => {
      const account = demoAccounts.find((a) => a.id === entry.accountId);
      totalIncome += entry.income;

      // Calculate expenditure (cashOut that isn't transfers)
      const expenditure = Math.max(0, entry.cashOut - (entry.cashIn - entry.income));
      totalExpenditure += expenditure;

      // For cash accounts, growth is interest
      if (account?.category === "Cash") {
        interestEarned += Math.max(0, entry.accountGrowth);
      } else {
        // For investments, growth is capital gains
        capitalGains += entry.accountGrowth;
      }
    });

    // Savings from income is income minus expenditure
    savingsFromIncome = Math.max(0, totalIncome - totalExpenditure);

    const savingsRate =
      totalIncome > 0 ? (savingsFromIncome / totalIncome) * 100 : 0;

    return {
      month: formatMonth(monthKey),
      monthKey,
      "Savings from Income": savingsFromIncome,
      "Interest Earned": interestEarned,
      "Capital Gains": capitalGains,
      "Total Income": totalIncome,
      "Total Expenditure": totalExpenditure,
      "Savings Rate": savingsRate,
    };
  });

  // Accounts for chart
  const accounts = demoAccounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    isISA: account.isISA,
    owner: account.owner || "Demo User",
    category: account.category,
  }));

  return {
    netWorthData,
    accountData,
    accountTypeData,
    categoryData,
    sourceData,
    accounts,
  };
}

// Get demo account histories (for account section)
export function getDemoAccountHistories(): Record<
  string,
  Array<{
    monthKey: string;
    month: string;
    endingBalance: number;
    cashIn: number;
    cashOut: number;
    income: number;
    expenditure: number;
    cashFlow: number;
    accountGrowth: number;
  }>
> {
  const histories: Record<string, MonthlyEntry[]> = {};

  demoAccounts.forEach((account) => {
    histories[account.id] = [];
  });

  Object.keys(demoMonthlyData)
    .sort()
    .forEach((monthKey) => {
      const entries = demoMonthlyData[monthKey];
      entries.forEach((entry) => {
        if (histories[entry.accountId]) {
          histories[entry.accountId].push(entry);
        }
      });
    });

  return histories;
}

// Get demo current values (latest balance for each account)
export function getDemoCurrentValues(): Record<
  string,
  { balance: number; monthKey: string } | null
> {
  const monthKeys = Object.keys(demoMonthlyData).sort();
  const latestMonth = monthKeys[monthKeys.length - 1];
  const entries = demoMonthlyData[latestMonth] || [];

  const currentValues: Record<
    string,
    { balance: number; monthKey: string } | null
  > = {};

  demoAccounts.forEach((account) => {
    const entry = entries.find((e) => e.accountId === account.id);
    currentValues[account.id] = entry
      ? { balance: entry.endingBalance, monthKey: latestMonth }
      : null;
  });

  return currentValues;
}

