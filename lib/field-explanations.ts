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
      title: "Deposits",
      description:
        "Total money received into the account during the month, including salary, transfers from other accounts, and any other deposits.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total money that left the account during the month, including bills, purchases, transfers to savings/investments, credit card payments, and loan payments.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Deposits minus Withdrawals). Positive values mean more money came in than went out.",
    },
    accountGrowth: {
      title: "Account Growth",
      description:
        "The change in account balance that isn't explained by cash flows. This is automatically calculated and typically represents interest earned or bank fees.",
    },
    income: {
      title: "Income",
      description:
        "The portion of deposits that represents earned income (salary, wages, etc.). Used to calculate your savings rate.",
    },
  },
  Savings: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total amount of money in your savings account at the end of the month.",
    },
    cashIn: {
      title: "Deposits",
      description:
        "Total deposits made to the savings account during the month, including transfers from other accounts.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total withdrawals made from the savings account during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Deposits minus Withdrawals). Positive values mean more money was deposited than withdrawn.",
    },
    accountGrowth: {
      title: "Interest Earned",
      description:
        "The change in account balance that isn't explained by cash flows. This is automatically calculated and typically represents interest earned on your savings.",
    },
  },
  Credit_Card: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total amount you owe on the credit card at the end of the month. Use your current outstanding balance as of month-end, not the statement balance (which may close a few days earlier).",
    },
    cashIn: {
      title: "Payments Made",
      description:
        "Total payments made to the credit card during the month to pay down the balance.",
    },
    cashOut: {
      title: "New Charges",
      description:
        "Total new spending on the credit card during the month. This includes all purchases, fees, and charges.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement (Payments Made minus New Charges). Negative values mean you spent more than you paid off.",
    },
    accountGrowth: {
      title: "Interest Charges",
      description:
        "The change in balance that isn't explained by payments and charges. This is automatically calculated and typically represents interest charges or fees.",
    },
  },
  Loan: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total amount you still owe on the loan at the end of the month (remaining balance).",
    },
    cashIn: {
      title: "Payments Made",
      description:
        "Total payments made toward the loan during the month (principal and interest payments).",
    },
    cashOut: {
      title: "New Drawdowns",
      description:
        "Additional funds drawn from the loan (if applicable). For most fixed loans, this will be 0.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement (Payments Made minus New Drawdowns).",
    },
    accountGrowth: {
      title: "Interest Accrued",
      description:
        "The change in balance that isn't explained by payments and drawdowns. This is automatically calculated and typically represents interest accrued.",
    },
  },
  Investment: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total market value of your investment account at the end of the month.",
    },
    cashIn: {
      title: "Contributions",
      description:
        "Total contributions or deposits made to the investment account during the month.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total withdrawals from the investment account during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Contributions minus Withdrawals). Positive values mean more money was invested than withdrawn.",
    },
    accountGrowth: {
      title: "Capital Gains/Losses",
      description:
        "The change in account value that isn't explained by cash flows. This is automatically calculated and represents investment gains or losses.",
    },
  },
  Stock: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total market value of your stock holdings at the end of the month.",
    },
    cashIn: {
      title: "Contributions",
      description:
        "Total funds added to purchase stocks during the month, including deposits and dividend reinvestments.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total proceeds from selling stocks or withdrawing cash during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Contributions minus Withdrawals).",
    },
    accountGrowth: {
      title: "Capital Gains/Losses",
      description:
        "The change in portfolio value that isn't explained by cash flows. This is automatically calculated and represents stock price gains or losses.",
    },
  },
  Crypto: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total market value of your cryptocurrency holdings at the end of the month.",
    },
    cashIn: {
      title: "Contributions",
      description:
        "Total funds added to purchase cryptocurrency during the month.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total proceeds from selling cryptocurrency or withdrawing funds during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Contributions minus Withdrawals).",
    },
    accountGrowth: {
      title: "Capital Gains/Losses",
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
      title: "Contributions",
      description:
        "Total contributions made to the pension during the month, including employer and personal contributions.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total withdrawals or distributions taken from the pension during the month (if applicable).",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Contributions minus Withdrawals).",
    },
    accountGrowth: {
      title: "Capital Gains/Losses",
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
      title: "Contributions",
      description:
        "Total funds added to purchase commodities during the month.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total proceeds from selling commodities during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Contributions minus Withdrawals).",
    },
    accountGrowth: {
      title: "Capital Gains/Losses",
      description:
        "The change in portfolio value that isn't explained by cash flows. This is automatically calculated and represents commodity price gains or losses.",
    },
  },
  Stock_options: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The total value of your stock options at the end of the month.",
    },
    cashIn: {
      title: "Contributions",
      description:
        "Total value of stock options granted or acquired during the month.",
    },
    cashOut: {
      title: "Withdrawals",
      description:
        "Total value from exercising or selling stock options during the month.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of value (Contributions minus Withdrawals).",
    },
    accountGrowth: {
      title: "Capital Gains/Losses",
      description:
        "The change in options value that isn't explained by cash flows. This is automatically calculated and represents changes in underlying stock price or time value.",
    },
  },
  Asset: {
    endingBalance: {
      title: "Ending Balance",
      description:
        "The current market value of your physical asset at the end of the month (e.g., car value, property value).",
    },
    cashIn: {
      title: "Capital Invested",
      description:
        "Money spent on capital improvements that increase the asset's value (e.g., property renovations).",
    },
    cashOut: {
      title: "Proceeds from Sale",
      description:
        "Money received from selling part or all of the asset.",
    },
    cashFlow: {
      title: "Cash Flow",
      description:
        "The net movement of money (Capital Invested minus Proceeds from Sale).",
    },
    accountGrowth: {
      title: "Appreciation / Depreciation",
      description:
        "The change in asset value that isn't explained by cash flows. This is automatically calculated and represents market appreciation or depreciation.",
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
