# Account Section - Backend Model and Functionality Specification

This document outlines the data model and key functionalities for the Account section of the Net Worth tracking application. This information will be used to generate a UI mockup in v0.

## Database Schema

### Accounts Table

```typescript
{
  id: string (UUID, primary key)
  userId: string (UUID, foreign key to users table)
  name: string (required)
  type: AccountType (required, enum - see below)
  category: AccountCategory (required, enum - default: "Investments")
  currency: Currency (required, enum - default: "GBP")
  isISA: boolean (default: false)
  owner: string (required, default: "all")
  isClosed: boolean (default: false)
  closedAt: timestamp | null
  displayOrder: integer (default: 0)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Account Type Enum

The following account types are supported:

- `Current` - Current/checking accounts
- `Savings` - Savings accounts
- `Investment` - General investment accounts
- `Stock` - Stock portfolios
- `Crypto` - Cryptocurrency holdings
- `Pension` - Pension accounts
- `Commodity` - Commodity holdings
- `Stock_options` - Stock options
- `Credit_Card` - Credit card accounts (liabilities)
- `Loan` - Loan accounts (liabilities)

### Account Category Enum

- `Cash` - Cash-based accounts (Current, Savings, Credit_Card, Loan)
- `Investments` - Investment accounts (Investment, Stock, Crypto, Pension, Commodity, Stock_options)

### Currency Enum

Supported currencies:

- `GBP` - British Pound
- `EUR` - Euro
- `USD` - US Dollar
- `AED` - UAE Dirham

### Monthly Entries Table

```typescript
{
  id: string (UUID, primary key)
  accountId: string (UUID, foreign key to accounts table, cascade delete)
  month: string (required, format: "YYYY-MM")
  endingBalance: numeric (required)
  cashIn: numeric (required)
  cashOut: numeric (required)
  income: numeric (default: "0") - Only relevant for Current accounts
  expenditure: numeric (default: "0") - Computed field: cashOut - internalTransfersOut - debtPayments
  internalTransfersOut: numeric (default: "0") - Only relevant for Current accounts
  debtPayments: numeric (default: "0") - Only relevant for Current accounts
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Computed Fields in MonthlyEntry

- `cashFlow`: cashIn - cashOut (calculated client-side)
- `accountGrowth`: Calculated as the change in endingBalance that isn't explained by cash flows
  - Formula: endingBalance - previousEndingBalance - cashFlow
- `expenditure`: Only for Current accounts, computed as: cashOut - internalTransfersOut - debtPayments

## Key Functionalities

### Account Management

#### 1. Create Account

**Function**: `createAccount(data)`

**Required Fields**:

- `name`: string
- `type`: AccountType
- `category`: "Cash" | "Investments"
- `isISA`: boolean
- `owner`: string
- `currency`: Currency

**Behavior**:

- Automatically assigns the next `displayOrder` value (max + 1)
- Associates account with the authenticated user
- Returns: `{ success: boolean, account?: Account, error?: string }`

#### 2. Update Account

**Function**: `updateAccount(data)`

**Required Fields**:

- `id`: string
- `name`: string
- `type`: AccountType
- `category`: "Cash" | "Investments"
- `isISA`: boolean
- `owner`: string
- `currency`: Currency

**Behavior**:

- Updates all account fields except `id`, `userId`, `displayOrder`
- Updates `updatedAt` timestamp
- Returns: `{ success: boolean, account?: Account, error?: string }`

#### 3. Delete Account

**Function**: `deleteAccount(accountId: string)`

**Behavior**:

- Cascades delete all associated monthly entries
- Returns: `{ success: boolean, error?: string }`

#### 4. Toggle Account Closed Status

**Function**: `toggleAccountClosed(accountId: string, isClosed: boolean)`

**Behavior**:

- Sets `isClosed` flag
- Sets `closedAt` timestamp when closing, null when reopening
- Returns: `{ success: boolean, account?: Account, error?: string }`

#### 5. Update Account Display Order

**Function**: `updateAccountDisplayOrder(accountOrders: Array<{ id: string, displayOrder: number }>)`

**Behavior**:

- Updates multiple accounts' display order in a transaction
- Used for drag-and-drop reordering
- Returns: `{ success: boolean, error?: string }`

### Monthly Entry Management

#### 6. Add Monthly Entry

**Function**: `addMonthlyEntry(accountId: string, month: string, entry: {...})`

**Required Fields**:

- `endingBalance`: number
- `cashIn`: number
- `cashOut`: number

**Optional Fields** (only for Current accounts):

- `income`: number (default: 0)
- `internalTransfersOut`: number (default: 0)
- `debtPayments`: number (default: 0)

**Behavior**:

- Validates that no entry exists for the account/month combination
- Computes `expenditure` field automatically (for Current accounts)
- Automatically fetches exchange rates for the month (async, non-blocking)
- Returns: `{ success: boolean, error?: string }`

#### 7. Update Monthly Entry

**Function**: `updateMonthlyEntry(accountId: string, month: string, entry: {...})`

**Required Fields**: Same as `addMonthlyEntry`

**Behavior**:

- Updates existing monthly entry
- Recomputes `expenditure` field
- Updates `updatedAt` timestamp
- Returns: `{ success: boolean, error?: string }`

### Data Retrieval

#### 8. Get Accounts

**Function**: `getAccounts(includeClosed: boolean = false)`

**Behavior**:

- Returns all accounts for the authenticated user (and shared users)
- Orders by `displayOrder` (ascending), then `createdAt` (ascending)
- Filters out closed accounts unless `includeClosed` is true
- Returns: `Account[]`

#### 9. Get Current Value

**Function**: `getCurrentValue(accountId: string)`

**Behavior**:

- Returns the `endingBalance` from the most recent monthly entry
- Returns `0` if no entries exist
- Returns: `number`

#### 10. Get Account History

**Function**: `getAccountHistory(accountId: string)`

**Behavior**:

- Returns all monthly entries for the account
- Ordered by month (descending - most recent first)
- Includes computed fields: `cashFlow`, `accountGrowth`
- Returns: `MonthlyEntry[]`

#### 11. Get Monthly Data

**Function**: `getMonthlyData()`

**Behavior**:

- Returns all monthly entries grouped by account ID
- Returns: `Record<string, MonthlyEntry[]>` (key is accountId)

## UI Features and Interactions

### Account Display

1. **Account List View**

   - Displays all accounts in a table/list format
   - Shows account name, owner, type badge, current value, value change
   - Supports drag-and-drop reordering
   - Can be filtered by:
     - Account (multi-select)
     - Account Type (multi-select)
     - Category (multi-select)
     - Owner (single select, includes "all" option)
   - Toggle to show/hide closed accounts
   - Display count: "Showing X of Y accounts"

2. **Account Row/Card**

   - Collapsible component (expandable to show monthly history)
   - Header shows:
     - Drag handle (for reordering)
     - Account name
     - Owner name
     - Account type badge
     - Current value (with currency conversion support)
     - Value change (absolute and percentage) for selected time period
     - Actions menu (Edit, Archive/Unarchive, Delete)
   - Visual indicator for closed accounts (opacity/styling)

3. **Time Period Selector**
   - Options: `1M`, `3M`, `6M`, `1Y`, `YTD`, `ALL`
   - Used to calculate value changes (compares current value to value N periods ago)
   - Affects the value change display for all accounts

### Monthly History

4. **Monthly History Table**

   - Displayed when account row is expanded
   - Shows all monthly entries in reverse chronological order (newest first)
   - Columns:
     - Month (YYYY-MM format)
     - Ending Balance
     - Income (only for Current accounts)
     - Internal Transfers Out (only for Current accounts)
     - Debt Payments (only for Current accounts)
     - Expenditure (computed, only for Current accounts)
     - Cash In
     - Cash Out
     - Cash Flow (computed: cashIn - cashOut)
     - Account Growth (computed)
     - Actions (Edit, Save)
   - Each column header can have an info button with field explanation
   - Supports inline editing
   - Empty state: "No monthly data yet. Use the 'Add Month' button to get started."

5. **Add Month Dialog**

   - Triggered from expanded account row
   - Form fields:
     - Month (date picker, format: YYYY-MM)
     - Ending Balance
     - Cash In
     - Cash Out
     - Income (only for Current accounts)
     - Internal Transfers Out (only for Current accounts)
     - Debt Payments (only for Current accounts)
   - Shows current account value as reference
   - Includes field explanations via info buttons
   - Validates required fields

6. **Edit Monthly Entry**
   - Inline editing within the monthly history table
   - Click "Edit" to enter edit mode
   - All numeric fields become editable inputs
   - "Save" button commits changes
   - "Cancel" or clicking outside cancels edit mode

### Account Forms

7. **Add Account Dialog**

   - Form fields:
     - Account Name (text input, required)
     - Account Owner (text input, required)
     - Account Type (select dropdown, required)
     - Account Category (select dropdown, required)
     - Currency (select dropdown, required)
     - ISA Account (checkbox)
   - Validates all required fields
   - On success: closes dialog, refreshes data, shows success toast

8. **Edit Account Dialog**
   - Same fields as Add Account Dialog
   - Pre-populated with existing account data
   - Updates existing account on submit

### Account Actions

9. **Account Actions Menu**
   - Edit Account: Opens edit account dialog
   - Archive/Unarchive: Toggles `isClosed` status
   - Delete Account: Opens confirmation dialog, then deletes account (with cascade delete of monthly entries)

### Advanced Features

10. **Currency Conversion**

    #### Overview

    - Each account has a native currency (stored in `account.currency`)
    - Users can select a global display currency from: GBP, EUR, USD, AED, or "BASE"
    - "BASE" mode shows each account in its native currency (no conversion)
    - When display currency is not "BASE" and differs from account currency, values are converted using exchange rates

    #### Exchange Rate Storage

    - Exchange rates are stored in the `exchange_rates` table
    - Each rate entry is keyed by date (format: "YYYY-MM-DD" - last day of the month)
    - Rates are stored with GBP as the base currency
    - Structure: `{ date: "YYYY-MM-DD", gbpRate: 1, eurRate: X, usdRate: Y, aedRate: Z }`
    - Example: If `eurRate = 1.15`, it means 1 GBP = 1.15 EUR

    #### Rate Fetching

    - Historical rates are fetched from HexaRate API for specific dates
    - When a monthly entry is added, exchange rates for that month are automatically fetched (async, non-blocking)
    - Rates are fetched one currency pair at a time with 300ms delays to avoid rate limiting
    - Rates are cached in the database (one entry per month)
    - Client-side rates are loaded via `ExchangeRatesContext` which fetches rates for all months needed

    #### Conversion Process

    - All conversions use GBP as an intermediary (fromCurrency → GBP → toCurrency)
    - Formula:
      1. Convert fromCurrency to GBP: `amountInGbp = amount / fromRate` (if fromCurrency ≠ GBP)
      2. Convert GBP to toCurrency: `amountInTarget = amountInGbp * toRate` (if toCurrency ≠ GBP)
    - Example: Convert 100 EUR to USD
      - EUR → GBP: 100 / 1.15 = 86.96 GBP
      - GBP → USD: 86.96 \* 1.27 = 110.44 USD

    #### Display Behavior

    - When `displayCurrency === "BASE"`:
      - Each account shows values in its native currency
      - No conversion is performed
      - No secondary value display
    - When `displayCurrency !== "BASE"` and differs from account currency:
      - Primary display: Converted value in display currency (large, prominent)
      - Secondary display: Original value in account's native currency (smaller, muted text below)
    - When `displayCurrency` matches account currency:
      - Shows value normally (no conversion needed)
      - No secondary display

    #### Historical Conversion

    - Each monthly entry uses exchange rates from that specific month
    - When viewing historical data, the conversion uses the rate for that month's date
    - Month format: "YYYY-MM" is converted to "YYYY-MM-DD" (last day of month) for rate lookup
    - If rates for a month are not available, the system:
      1. Falls back to the latest available rate in the database
      2. If no rates exist, shows original value (no conversion)

    #### Client-Side Conversion Hook

    - `useCurrencyConversion(amount, fromCurrency, toCurrency, forMonth?)` hook handles client-side conversion
    - Uses pre-loaded rates from `ExchangeRatesContext`
    - Returns `{ convertedAmount, isLoading }`
    - `isLoading` is true when rates for the month are not yet loaded
    - Conversion is instant once rates are loaded (just math, no API calls)

    #### Currency Symbols

    - GBP: £
    - EUR: €
    - USD: $
    - AED: د.إ (displays after the amount)

    #### Currency Formatting

    - Amounts are rounded down (floored) before formatting
    - Format: `${symbol}${amount}` (except AED which is `${amount} ${symbol}`)
    - Uses `Intl.NumberFormat` with no decimal places (whole numbers only)
    - Example: £1,234,567 (not £1,234,567.89)

11. **Value Change Calculation**

    - Calculated client-side based on selected time period
    - Compares current value (latest entry's endingBalance) to value N periods ago:
      - `1M`: Compare to 1 month ago
      - `3M`: Compare to 3 months ago
      - `6M`: Compare to 6 months ago
      - `1Y`: Compare to 12 months ago
      - `YTD`: Compare to January of current year
      - `ALL`: Compare to oldest entry
    - Displays both absolute change and percentage change
    - Color-coded (green for positive, red for negative)

12. **Masking Support**

    #### Overview

    - Privacy feature to hide financial values on screen
    - Useful for screen sharing, public viewing, or added privacy
    - Masking only affects display - actual data in database is never masked

    #### Implementation

    - Global toggle controlled via `MaskingContext` (React Context)
    - Default state: Masked (true) - values are hidden by default
    - State is persisted in browser cookies (SSR-friendly) with key `"valueMasking"`
    - Masked value display: `"••••••"` (six bullet points)

    #### Masking Behavior

    - When masked (`isMasked === true`):
      - All currency values display as `"••••••"`
      - Applies to: account balances, value changes, monthly entry values, net worth
      - Percentage changes are NOT masked (always visible)
      - Account names, types, and other non-numeric data remain visible
      - Inline editing still works normally (values are visible when editing)
    - When unmasked (`isMasked === false`):
      - All values display normally with proper formatting
      - Currency symbols and formatting are shown

    #### Mask Toggle Button

    - UI component: Eye/EyeOff icon button
    - Location: Typically in navigation bar or header
    - States:
      - EyeOff icon when masked (click to show values)
      - Eye icon when unmasked (click to hide values)
    - Accessible: Includes `aria-label` for screen readers

    #### Components Using Masking

    - Account current values
    - Value change displays (absolute change only, percentage stays visible)
    - Monthly history table (all numeric columns)
    - Net worth displays
    - Chart values (if applicable)
    - Any component displaying currency amounts

    #### Technical Details

    - Hook: `useMasking()` returns `{ isMasked, toggleMasking, formatCurrency }`
    - `formatCurrency(value)` function handles masking logic
    - When masked, returns `"••••••"`; when unmasked, returns formatted number
    - Masking state updates trigger re-renders of all consuming components
    - Cookie persistence ensures preference is remembered across sessions and works with SSR

    #### User Experience Notes

    - Masking preference is per-browser (cookies are browser-specific)
    - Server-side rendering shows correct masked/unmasked state immediately (no flash)
    - Masking can be toggled at any time without affecting data
    - Editing values temporarily shows them (values are visible in input fields)
    - Masking is a display-only feature - exported data, calculations, and server operations are unaffected

13. **Drag and Drop Reordering**
    - Accounts can be reordered via drag handle
    - Updates `displayOrder` in database
    - Optimistic UI updates with rollback on error

## Field Explanations (Info Buttons)

Each field in the monthly history table can have an info button that shows:

- **Title**: Field name
- **Description**: Detailed explanation of what the field represents

Key differences by account type:

- **Current accounts**: Show Income, Expenditure, Internal Transfers Out, Debt Payments fields
- **Other account types**: Only show standard fields (Ending Balance, Cash In, Cash Out, Cash Flow, Account Growth)
- **Credit Cards**: Cash In = payments (reduces balance), Cash Out = new spending (increases balance)
- **Loans**: Cash In = payments (reduces balance), Cash Out = drawdowns (increases balance)

## Business Rules

1. **Income/Expenditure Fields**: Only shown and editable for Current accounts
2. **Expenditure Calculation**: Automatic for Current accounts: `cashOut - internalTransfersOut - debtPayments`
3. **Account Growth Calculation**: `endingBalance - previousEndingBalance - cashFlow`
4. **Monthly Entry Uniqueness**: One entry per account per month (enforced at database level)
5. **Display Order**: Auto-incremented for new accounts, manually updated via drag-and-drop
6. **Closed Accounts**: Can be hidden via toggle, still accessible for historical data
7. **Currency Conversion**: Uses exchange rates stored per month (YYYY-MM-DD format, last day of month)
8. **Cascade Delete**: Deleting an account permanently deletes all associated monthly entries

## Data Flow

1. **Account Creation** → Auto-assigns displayOrder → Returns account
2. **Monthly Entry Creation** → Validates uniqueness → Computes expenditure → Stores entry → Fetches FX rates (async)
3. **Account Update** → Updates fields → Updates timestamp → Returns updated account
4. **Display Order Update** → Updates multiple accounts in transaction → Returns success/error
5. **Value Change Calculation** → Fetches account history → Compares current vs. N periods ago → Displays change

## Responsive Design Considerations

- Mobile: Stacked layout, simplified account row, collapsible monthly history
- Desktop: Table layout, expanded account rows with inline editing
- Touch-friendly drag handles for mobile reordering
- Horizontal scrolling for monthly history table on mobile

## Notes for UI Design

- Use clear visual hierarchy: Account name is primary, type/owner are secondary
- Color-code value changes: Green for positive, red for negative
- Show loading states during async operations
- Provide clear empty states with actionable CTAs
- Use badges for account types
- Consider accessibility: keyboard navigation, ARIA labels, screen reader support
- Mobile-first responsive design
- Support both light and dark themes
