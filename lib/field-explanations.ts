import type { AccountType } from "./types";

export interface FieldExplanation {
  title: string;
  description: string;
}

type FieldExplanations = Record<
  AccountType,
  {
    endingBalance: FieldExplanation;
    cashIn: FieldExplanation;
    cashOut: FieldExplanation;
    cashFlow: FieldExplanation;
    accountGrowth: FieldExplanation;
    income?: FieldExplanation;
    expenditure?: FieldExplanation;
    internalTransfersOut?: FieldExplanation;
    debtPayments?: FieldExplanation;
  }
>;

export const fieldExplanations: FieldExplanations = {
  Current: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total amount of money in your current account at the end of the month.",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total money received into the account during the month, including salary, transfers from other accounts, and any other deposits.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total money spent or transferred out of the account during the month, including bills, purchases, transfers to other accounts, credit card payments, and loan payments. Note: Credit card payments and loan payments are included in Cash Out, but they should NOT be counted as Expenditure (they are just paying down liabilities, not new spending).",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Cash In minus Cash Out). Positive values mean more money came in than went out.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in account balance that isn't explained by cash flows. This is automatically calculated and typically represents interest earned or fees charged.",
    },
    income: {
      title: "Income",
      description:
        "The portion of Cash In that represents earned income (salary, wages, etc.). This should be part of your total Cash In amount.",
    },
    expenditure: {
      title: "Expenditure (Computed)",
      description:
        "Automatically calculated as: Cash Out - Internal Transfers Out - Debt Payments. This represents spending on goods and services directly from this account (excluding transfers to savings, investments, credit card payments, or loan payments).",
    },
    internalTransfersOut: {
      title: "Internal Transfers Out",
      description:
        "Money transferred out of this account to other accounts you own (e.g., transfers to savings accounts, investment accounts, or other current accounts). This is NOT expenditure - it's just moving money between your own accounts.",
    },
    debtPayments: {
      title: "Debt Payments",
      description:
        "Payments made to pay down liabilities such as credit card payments and loan payments. This is NOT expenditure - these payments are just reducing your debt, not new spending. The actual spending happened when you used the credit card or took out the loan.",
    },
  },
  Savings: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total amount of money in your savings account at the end of the month.",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total deposits made to the savings account during the month, including transfers from other accounts.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total withdrawals made from the savings account during the month, including transfers to other accounts.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Cash In minus Cash Out). Positive values mean more money was deposited than withdrawn.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in account balance that isn't explained by cash flows. This is automatically calculated and typically represents interest earned on your savings.",
    },
  },
  Credit_Card: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total amount you owe on the credit card at the end of the month (your outstanding balance). This equals: Previous Balance + Debits (new spending) - Payments and Credits.",
    },
    cashIn: {
      title: "Cash In (Payments and Credits)",
      description:
        "Total payments made to the credit card during the month to pay down the balance. This is the 'Payments and Credits' line from your credit card statement. Money going IN to reduce what you owe.",
    },
    cashOut: {
      title: "Cash Out (Debits/New Spending)",
      description:
        "Total new spending (debits) on the credit card during the month. This is the 'Debits' or 'Purchases' line from your credit card statement. This includes all purchases, fees, and charges made on the card. This amount is automatically counted as expenditure.",
    },
    expenditure: {
      title: "Expenditure (Computed)",
      description:
        "For credit cards, expenditure equals Cash Out (new spending). This represents all purchases and charges made on the card during the month. Note: Payments made to the card (Cash In) are NOT expenditure - they're just paying down debt.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement (Cash In minus Cash Out). Negative values are normal as spending increases your balance, while payments reduce it.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in balance that isn't explained by cash flows. This is automatically calculated and typically represents interest charges, fees, or other adjustments.",
    },
  },
  Loan: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total amount you still owe on the loan at the end of the month (remaining principal balance).",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total payments made toward the loan during the month (principal and interest payments). These payments reduce your loan balance. Note: These payments from your Current account should NOT be counted as Expenditure on your Current account.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total drawdowns or advances taken from the loan during the month (if applicable). For most standard loans (like car loans, mortgages), this will typically be 0. Only applicable if you have a line of credit or loan that allows you to withdraw additional funds.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement (Cash In minus Cash Out). Typically negative as payments reduce your balance (or zero if no payments and no drawdowns).",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in balance that isn't explained by cash flows. This is automatically calculated and typically represents interest accrued or other loan adjustments.",
    },
  },
  Investment: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total market value of your investment account at the end of the month.",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total contributions or deposits made to the investment account during the month.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total withdrawals or sales proceeds from the investment account during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Cash In minus Cash Out). Positive values mean more money was invested than withdrawn.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in account value that isn't explained by cash flows. This is automatically calculated and represents investment gains or losses (capital appreciation/depreciation).",
    },
  },
  Stock: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total market value of your stock holdings at the end of the month.",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total funds added to purchase stocks during the month, including deposits and dividend reinvestments.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total proceeds from selling stocks or withdrawing cash during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Cash In minus Cash Out). Positive values mean more money was invested than withdrawn.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in portfolio value that isn't explained by cash flows. This is automatically calculated and represents stock price gains or losses.",
    },
  },
  Crypto: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total market value of your cryptocurrency holdings at the end of the month (in the account's currency).",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total funds added to purchase cryptocurrency during the month, including deposits and fiat conversions.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total proceeds from selling cryptocurrency or withdrawing funds during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Cash In minus Cash Out). Positive values mean more money was invested than withdrawn.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in portfolio value that isn't explained by cash flows. This is automatically calculated and represents cryptocurrency price gains or losses.",
    },
  },
  Pension: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total value of your pension account at the end of the month.",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total contributions made to the pension during the month, including employer contributions and your own contributions.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total withdrawals or distributions taken from the pension during the month (if applicable).",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Cash In minus Cash Out). Positive values mean more money was contributed than withdrawn.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in pension value that isn't explained by cash flows. This is automatically calculated and represents investment gains or losses within the pension fund.",
    },
  },
  Commodity: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total market value of your commodity holdings at the end of the month.",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total funds added to purchase commodities during the month.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total proceeds from selling commodities or withdrawing funds during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Cash In minus Cash Out). Positive values mean more money was invested than withdrawn.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in portfolio value that isn't explained by cash flows. This is automatically calculated and represents commodity price gains or losses.",
    },
  },
  Stock_options: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total value of your stock options at the end of the month (based on current stock price and option terms).",
    },
    cashIn: {
      title: "Cash In",
      description:
        "Total value of stock options granted or acquired during the month.",
    },
    cashOut: {
      title: "Cash Out",
      description:
        "Total value from exercising or selling stock options during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of value (Cash In minus Cash Out). Positive values mean more options were granted/acquired than exercised/sold.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in options value that isn't explained by cash flows. This is automatically calculated and represents changes in underlying stock price or time value.",
    },
  },
};

/**
 * Get the explanation for a specific field and account type
 */
export function getFieldExplanation(
  accountType: AccountType,
  field: keyof FieldExplanations[AccountType]
): FieldExplanation | undefined {
  return fieldExplanations[accountType]?.[field];
}

