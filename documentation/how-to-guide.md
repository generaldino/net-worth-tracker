# Net Worth Tracker - User Guide

Welcome to the Net Worth Tracker! This comprehensive guide will help you understand how to use the app to track and analyze your wealth over time.

## Introduction

The Net Worth Tracker is a powerful tool for tracking your financial wealth over time. It allows you to:

- Track multiple accounts across different asset types
- Monitor your net worth progression with visual charts
- Analyze your savings rate and wealth sources
- Project future wealth based on different scenarios
- Share your dashboard with trusted individuals
- Export your data for external analysis

---

## Getting Started

### First Steps

1. **Sign In**: Use your Google account to sign in to the application.

2. **Create Your First Account**: Click the "Add Account" button to begin tracking your financial accounts.

3. **Add Monthly Data**: For each account, add monthly entries tracking your balances and transactions.

4. **Explore Charts**: Use the chart section to visualize your wealth trends and patterns.

---

## Account Types

The app supports ten different account types, each designed for specific financial instruments:

### Cash Accounts

#### Current

Your primary checking account for day-to-day transactions.

**When to use**: Track your main bank account where salary deposits and regular expenses are processed.

**Fields tracked**:

- Ending Balance: Total amount at month end
- Cash In: All deposits including salary and transfers
- Cash Out: All withdrawals including expenses, transfers, and debt payments
- Income: Portion of Cash In representing earned income
- Expenditure: Actual spending (excludes transfers and debt payments)
- Internal Transfers Out: Money moved to other accounts you own
- Debt Payments: Payments toward credit cards or loans

#### Savings

Interest-bearing savings accounts.

**When to use**: Track your savings accounts, high-yield savings, or money market accounts.

**Fields tracked**:

- Ending Balance, Cash In, Cash Out
- Account Growth: Automatically calculated interest earned

### Investment Accounts

#### Investment

General investment accounts (brokerage accounts, managed funds).

**When to use**: Track your investment accounts holding stocks, bonds, or mutual funds.

**Fields tracked**:

- Ending Balance: Market value of investments
- Cash In: Contributions/deposits
- Cash Out: Withdrawals/sales proceeds
- Account Growth: Capital gains/losses (automatically calculated)

#### Stock

Direct stock holdings.

**When to use**: Track individual stock positions or a dedicated stock portfolio.

**Fields tracked**: Same as Investment accounts, with growth representing stock price appreciation/depreciation.

#### Crypto

Cryptocurrency holdings.

**When to use**: Track your cryptocurrency investments (Bitcoin, Ethereum, etc.).

**Fields tracked**: Market value in your chosen currency, with growth representing price changes.

#### Pension

Retirement accounts (401k, IRA, pensions, etc.).

**When to use**: Track your retirement savings and employer pension contributions.

**Fields tracked**: Account value including contributions and investment growth.

#### Commodity

Physical or commodity investments (gold, silver, oil, etc.).

**When to use**: Track commodity holdings or commodity-focused investments.

#### Stock Options

Employee stock options or option positions.

**When to use**: Track vested or unvested stock options from your employer.

**Fields tracked**: Option value based on current stock price and option terms.

### Liability Accounts

> **Balance Convention**: Enter **POSITIVE** amounts for liability accounts. The ending balance represents how much you owe (e.g., enter `25000` for a $25,000 loan, not `-25000`). The app automatically treats these as liabilities and subtracts them from your net worth.

#### Credit Card

Credit card balances.

**When to use**: Track your credit card debt. The ending balance represents what you owe.

**Fields tracked**:

- Ending Balance: Amount you owe (enter as **positive** number)
- Cash In: Payments made to the card (reduces what you owe)
- Cash Out: New spending on the card (increases what you owe)

**Important notes**:

- Cash In = Payments made to the card (reduces balance)
- Cash Out = New spending on the card (increases balance)
- Expenditure equals Cash Out (new spending), not payments

#### Loan

Personal loans, mortgages, car loans, etc.

**When to use**: Track any outstanding loan balances.

**Fields tracked**:

- Ending Balance: Remaining principal owed (enter as **positive** number)
- Cash In: Loan payments (principal + interest)
- Cash Out: Drawdowns (typically 0 for standard loans)

**Important notes**:

- Enter the loan balance as a **positive** number (e.g., `25000` for a $25,000 loan)
- Loan payments from your Current account should NOT be counted as Expenditure on your Current account
- The app automatically treats loans as liabilities (subtracting from net worth)

### Physical Assets

#### Asset

Physical assets like vehicles, property, jewelry, or other valuable items.

**When to use**: Track the value of physical assets that contribute to your net worth. Common uses include:

- Vehicles (cars, motorcycles, boats)
- Real estate (if not tracked elsewhere)
- Valuable collectibles or jewelry
- Security deposits (rental apartments)

**Fields tracked**:

- Ending Balance: Current market value of the asset
- Cash In: Proceeds from selling (partially or fully), typically 0
- Cash Out: Capital improvements that add value, typically 0
- Account Growth: Appreciation or depreciation (automatically calculated)

**Important notes**:

- Update the ending balance monthly to reflect depreciation (vehicles lose ~1-2% per month) or appreciation (property in rising markets)
- The initial purchase is NOT recorded as Cash Out here - that happens from your Current account
- For financed assets (like cars), create BOTH an Asset account (for the car's value) and a Loan account (for what you owe). Your equity is the difference.
- For security deposits, simply set the ending balance to the deposit amount - it stays constant until you move out

**Example - Tracking a Financed Car:**

| Account           | Initial Balance | What it represents |
| ----------------- | --------------- | ------------------ |
| Car Loan          | -$25,000        | Amount you owe     |
| Car Value (Asset) | +$30,000        | Car's market value |
| **Your Equity**   | **+$5,000**     | Your down payment  |

---

## Account Categories

Accounts are organized into two categories:

### Cash

Liquid accounts like Current and Savings accounts. These are typically easily accessible funds.

### Investments

All investment and retirement accounts, including stocks, crypto, pensions, etc.

---

## Creating and Managing Accounts

### Adding a New Account

1. Click the **"Add Account"** button
2. Fill in the account details:

   - **Account Name**: A descriptive name (e.g., "Barclays Current Account")
   - **Account Owner**: The owner of the account (e.g., "John Doe" or "Joint")
   - **Account Type**: Select from the dropdown (see Account Types above)
   - **Account Category**: Choose "Cash" or "Investments"
   - **Currency**: Select the account's currency (GBP, EUR, USD, or AED)
   - **ISA Account**: Check if this is an ISA (Individual Savings Account) for tax-advantaged tracking

3. Click **"Add Account"** to create the account

### Editing Accounts

- Click the edit icon next to any account to modify its details
- You can update the name, type, category, currency, and other settings

### Closing Accounts

- Mark accounts as closed when you no longer actively use them
- Closed accounts remain in your history but are excluded from current calculations

### Reordering Accounts

- Drag and drop accounts to organize them in your preferred order
- The display order helps you organize accounts by importance or type

---

## Monthly Entries

Monthly entries are the core of wealth tracking. Each month, you'll add data for each active account.

### Adding Monthly Data

1. Click **"Add Month"** or the calendar icon
2. Select the month you want to enter (format: YYYY-MM)
3. For each account, enter:
   - **Ending Balance**: The account balance at the end of the month
   - **Cash In**: Total money coming into the account
   - **Cash Out**: Total money going out of the account

### Account-Specific Fields

Depending on the account type, you may also see:

#### For Current Accounts:

- **Income**: The portion of Cash In that represents earned income
- **Internal Transfers Out**: Money transferred to other accounts you own
- **Debt Payments**: Payments toward credit cards or loans
- **Expenditure**: Automatically calculated as Cash Out - Internal Transfers Out - Debt Payments

#### For Credit Cards:

- **Cash In**: Payments made to the card
- **Cash Out**: New spending/debits on the card
- **Expenditure**: Automatically equals Cash Out (all new spending)

#### For Loans:

- **Cash In**: Loan payments (principal + interest)
- **Cash Out**: Drawdowns (usually 0)

### Understanding Calculated Fields

The app automatically calculates:

- **Cash Flow**: Cash In - Cash Out (net movement of money)
- **Account Growth**: The change in balance not explained by cash flows
  - For savings: Interest earned
  - For investments: Capital gains/losses
  - For liabilities: Interest accrued

### Best Practices for Monthly Entries

1. **Be Consistent**: Enter data at the same time each month (ideally shortly after month-end)

2. **Use Bank Statements**: Reference your bank statements or account summaries for accurate numbers

3. **Don't Double-Count**:

   - If you transfer money from Current to Savings, count it as Cash Out in Current and Cash In in Savings
   - Loan payments should be counted as Cash In on the loan, not as Expenditure on your Current account

4. **Handle Currency Conversion**: The app automatically converts between currencies using historical exchange rates

---

## Understanding Chart Types

The app provides multiple chart types to visualize different aspects of your wealth:

### 1. Net Worth (Total)

**Purpose**: Shows your overall net worth over time (Assets - Liabilities).

**Use cases**:

- Track overall wealth progression
- View long-term trends
- Compare percentage vs. absolute changes

**Options**: Toggle between absolute values and percentage changes from starting point.

### 2. Assets vs Liabilities

**Purpose**: Compares your total assets against total liabilities over time.

**Use cases**:

- Monitor debt-to-asset ratio
- Track when assets exceed liabilities
- Understand the composition of your net worth

### 3. By Wealth Source

**Purpose**: Breaks down net worth changes by source: Savings from Income, Interest Earned, and Capital Gains.

**Use cases**:

- Understand what's driving wealth growth
- Analyze passive vs. active income contributions
- Track investment performance vs. savings rate

**Components**:

- **Savings from Income**: Money saved from your earnings
- **Interest Earned**: Interest from savings and bonds
- **Capital Gains**: Investment gains from stocks, crypto, etc.

### 4. By Account

**Purpose**: Shows individual account balances over time as separate lines.

**Use cases**:

- Track performance of individual accounts
- Compare account growth rates
- Identify which accounts are growing fastest

### 5. Monthly Growth Rate

**Purpose**: Shows the percentage change in net worth each month.

**Use cases**:

- Identify months with high or low growth
- Spot trends in growth rate
- Compare growth rates across different time periods

### 6. Allocation

**Purpose**: Shows how your wealth is allocated across account types or categories (pie chart).

**Use cases**:

- Understand portfolio diversification
- Track allocation changes over time
- Ensure balanced investment distribution

**Options**:

- View by account type (Current, Savings, Stock, etc.)
- View by category (Cash vs. Investments)
- Select specific month for point-in-time allocation

### 7. Waterfall (Net Worth Changes)

**Purpose**: Visualizes the components of net worth change month-by-month.

**Use cases**:

- See exactly what contributed to monthly changes
- Understand the breakdown of increases/decreases
- Track savings contributions vs. investment gains

### 8. Savings Rate

**Purpose**: Shows your savings rate over time (savings as percentage of income).

**Use cases**:

- Monitor savings discipline
- Track savings rate trends
- Compare to financial goals (e.g., 20% savings rate)

### 9. Projection

**Purpose**: Forecasts future net worth based on your projections.

**Use cases**:

- Model different financial scenarios
- Plan for retirement
- Set savings goals

**See the [Wealth Projections](#wealth-projections) section for details.**

### Chart Controls

All charts support:

- **Time Period Selection**: View 1 Month, 3 Months, 6 Months, 1 Year, Year to Date, or All Time
- **Account Filtering**: Filter by specific accounts
- **Account Type Filtering**: Filter by account types
- **Category Filtering**: Filter by Cash or Investments
- **Currency Display**: Change the display currency for all values
- **Click for Details**: Click on data points to see detailed breakdowns

---

## Currency Support

The app supports multiple currencies and automatic conversion:

### Supported Currencies

- **GBP**: British Pound (£)
- **EUR**: Euro (€)
- **USD**: US Dollar ($)
- **AED**: UAE Dirham (AED)

### How Currency Conversion Works

1. **Account Currency**: Each account is set to its native currency
2. **Display Currency**: You can view all values in any supported currency using the currency selector
3. **Historical Rates**: The app uses historical exchange rates for past months, ensuring accurate conversions
4. **Automatic Updates**: Exchange rates are automatically fetched and stored for each month

### Using Multiple Currencies

- Create accounts in their native currencies
- The app automatically converts all values when displaying in a different currency
- Charts and totals are converted using appropriate historical rates
- This is especially useful for international portfolios

---

## Wealth Projections

The projection feature lets you forecast your future net worth based on different scenarios.

### Creating a Projection Scenario

1. Navigate to the **Wealth Projection Setup** section
2. Click to expand the projection panel
3. Click **"Create New Scenario"** or **"New Projection"**
4. Fill in the scenario details:

#### Basic Settings

- **Scenario Name**: Give your scenario a descriptive name (e.g., "Conservative Growth", "Early Retirement Plan")
- **Monthly Income**: Your expected monthly income
- **Savings Rate**: Percentage of income you plan to save (0-100%)
- **Time Period**: Number of months to project forward (e.g., 60 months = 5 years)

#### Growth Rates

Set expected annual growth rates for each account type:

- **Current**: Typically 0% (no interest on checking accounts)
- **Savings**: Interest rate (e.g., 2.5% for high-yield savings)
- **Investment/Stock**: Expected returns (e.g., 7% for stocks)
- **Crypto**: Higher volatility (e.g., 10-15% or higher)
- **Pension**: Expected pension fund returns
- **Other Types**: Set appropriate growth rates

#### Savings Allocation (Optional)

If you want to control where new savings go:

- Specify percentage allocation across account types
- Percentages must sum to 100%
- If not specified, savings are distributed proportionally based on current balances

### Using Projections

1. **View Projections**: Select the projection chart type and choose a scenario
2. **Compare Scenarios**: Create multiple scenarios to compare different paths
3. **Update Scenarios**: Edit scenarios as your situation changes
4. **Delete Scenarios**: Remove scenarios you no longer need

### Projection Tips

- **Be Realistic**: Use conservative estimates for growth rates to avoid over-optimism
- **Multiple Scenarios**: Create "Conservative", "Moderate", and "Optimistic" scenarios
- **Review Regularly**: Update projections as your financial situation changes
- **Account for Inflation**: Consider that growth rates should be above inflation

---

## Dashboard Sharing

Share your dashboard with trusted individuals (e.g., financial advisors, family members, partners).

### Inviting Users

1. Navigate to the **Sharing** section (or `/sharing` page)
2. Click **"Invite User"**
3. Enter the email address (must be a Gmail address)
4. Click **"Send Invitation"**

### How Sharing Works

- **Pending Invitations**: Users who haven't signed up yet will receive an invitation
- **Automatic Access**: If the user already has an account, they immediately get access
- **View-Only**: Shared users can view your dashboard but cannot edit your data
- **Real-Time Updates**: Shared users see updates as you add new data

### Managing Shared Access

- **View Shared Users**: See all users who have access to your dashboard
- **Revoke Access**: Remove access at any time by clicking "Revoke Access"
- **Pending Invitations**: See and manage invitations that haven't been accepted yet

### Privacy Considerations

- Only share with people you trust
- Shared users can see all your financial data
- You can revoke access at any time
- Shared users cannot modify your accounts or data

---

## Exporting Data

Export your financial data as a CSV file for external analysis or backup.

### How to Export

1. Click the **"Export CSV"** button (usually in the navigation or accounts section)
2. The file will download automatically with a filename like `net-worth-export-YYYY-MM-DD.csv`

### CSV Format

The exported CSV includes:

- Account information (ID, name, type, category, owner, currency, ISA status)
- Monthly entries for all accounts
- All fields: ending balance, cash in, cash out, income, expenditure, cash flow, account growth
- Timestamps for when entries were created/updated

### Use Cases for Export

- **Backup**: Keep a local copy of your data
- **Analysis**: Import into Excel or other tools for custom analysis
- **Tax Preparation**: Extract relevant data for tax filing
- **Historical Records**: Maintain long-term records outside the app

---

## Data Privacy

### Data Masking

The app includes a privacy feature to mask financial values on screen.

#### Using the Mask Toggle

1. Look for the eye icon (👁️) button in the navigation
2. Click to toggle between showing and hiding values
3. When masked, values appear as "••••••"
4. Your preference is saved in your browser

#### When to Use Masking

- When sharing your screen during presentations
- In public places where others might see your screen
- For added privacy when viewing sensitive information

**Note**: Masking only affects display - your actual data is always stored normally.

---

## Best Practices

### Getting Started

1. **Start Simple**: Begin with your most important accounts (current account, main savings)
2. **Add Gradually**: Don't feel you need to add everything at once
3. **Historical Data**: You can add historical monthly entries going back in time

### Data Entry

1. **Consistency**: Enter data at the same time each month (first few days of the new month)
2. **Accuracy**: Double-check numbers against bank statements
3. **Completeness**: Enter data for all accounts each month for accurate net worth calculations
4. **Don't Skip Months**: Even if there are no changes, enter $0 for cash flow to maintain history

### Account Organization

1. **Clear Naming**: Use descriptive account names (e.g., "Barclays Current - Joint")
2. **Owner Tracking**: Use the owner field to distinguish personal vs. joint accounts
3. **Close Inactive Accounts**: Mark closed accounts to keep your active list clean

### Understanding Your Data

1. **Review Charts Regularly**: Check charts monthly to spot trends
2. **Analyze Growth Sources**: Use "By Wealth Source" to understand what's driving growth
3. **Monitor Savings Rate**: Track your savings rate to ensure you're meeting goals
4. **Compare Projections**: Use projections to set and track financial goals

### Advanced Tips

1. **Multiple Scenarios**: Create multiple projection scenarios for different life paths
2. **Currency Management**: Use native currencies for each account; let the app handle conversion
3. **Regular Reviews**: Schedule monthly or quarterly reviews of your financial progress
4. **Share Strategically**: Share your dashboard with advisors or partners for collaborative planning

### Common Mistakes to Avoid

1. **Double-Counting Transfers**: Don't count internal transfers as expenditure
2. **Including Debt Payments as Expenses**: Loan/credit card payments reduce liabilities but aren't new spending
3. **Forgetting Closed Accounts**: Mark accounts as closed rather than deleting them (to preserve history)
4. **Inconsistent Entry Timing**: Enter data at different times can skew monthly comparisons
5. **Unrealistic Projections**: Be conservative with growth rate estimates

---

## Getting Help

If you encounter issues or have questions:

1. **Check This Guide**: Review relevant sections above
2. **Field Explanations**: Click the info (ℹ️) icon next to fields for detailed explanations
3. **Data Details Panel**: Click on chart data points to see detailed breakdowns

---

## Conclusion

The Net Worth Tracker is a powerful tool for understanding and managing your wealth. By consistently entering monthly data and exploring the various charts and features, you'll gain valuable insights into your financial situation and progress toward your goals.

Remember: The key to success is consistency. Make it a habit to update your accounts monthly, and you'll build a comprehensive picture of your financial journey over time.

Happy tracking! 🎉
