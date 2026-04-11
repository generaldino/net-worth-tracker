# Proposal: Simplify Account Inputs

## Problem

The current monthly entry form asks for too many data points that are hard for users to obtain:

**Account creation (6 fields):** Name, Owner, Type (11 options), Category (Cash/Investments), Currency, ISA

**Monthly entry per account (up to 7 fields for Current accounts):**
- Ending Balance
- Cash In
- Cash Out
- Income (Current only)
- Internal Transfers Out (Current only)
- Debt Payments (Current only)
- Expenditure (computed, Current only)

The distinctions between Cash In vs Income, Cash Out vs Internal Transfers vs Debt Payments are confusing and require users to do mental accounting gymnastics. Most people can easily look up their account balance but not decompose their cash flows into these categories.

## Goal

> I want to know how much my net worth is every month from all accounts, along with where the source of increase is from (income, capital gains, interest, etc.)

Two things matter:
1. **Total net worth each month** - what's the number?
2. **What drove the change** - income? capital gains? interest? spending?

## Proposed Simplification

### Monthly Entry: Simplified Fields

#### All Accounts

| Field | Required | Description |
|-------|----------|-------------|
| **Ending Balance** | Yes | Account value at end of month. The one number everyone can look up. |
| **Contributions** | Shown, defaults to 0 | Money you actively moved INTO this account (deposits, transfers in). |
| **Withdrawals** | Shown, defaults to 0 | Money you actively moved OUT of this account (withdrawals, transfers out). |

#### Current Accounts Only

| Field | Required | Description |
|-------|----------|-------------|
| **Income** | Shown, defaults to 0 | Salary/wages received this month. |

That's it. **Most accounts go from 3-7 fields down to 3. Current accounts go from 7 fields to 4.**

#### Per-Account-Type Field Labels

The underlying data is the same, but field labels adapt to make sense for each account type:

| Account Type | "Contributions" Label | "Withdrawals" Label |
|---|---|---|
| Current | Deposits | Withdrawals |
| Savings | Deposits | Withdrawals |
| Investment, Stock, Crypto, Commodity, Pension, Stock Options | Contributions | Withdrawals |
| Credit Card | Payments Made | New Charges |
| Loan | Payments Made | New Drawdowns |
| Asset | Capital Invested | Proceeds from Sale |

### How the System Derives Everything

The key insight: **Account Growth = Balance Change - Net Cash Movement**

```
Previous Balance:    10,000
Contributions:       +1,000
Withdrawals:           -200
Expected Balance:    10,800
Actual Balance:      11,200
                     ------
Account Growth:        +400  (auto-calculated)
```

The system categorizes growth automatically based on account type:

| Account Type | Growth Labelled As |
|---|---|
| Savings | Interest Earned |
| Investment, Stock, Crypto, Commodity, Pension, Stock Options | Capital Gains/Losses |
| Current | Bank Interest / Fees |
| Credit Card | Interest Charges |
| Loan | Interest Accrued |
| Asset | Appreciation / Depreciation |

**Expenditure** is computed and **stored explicitly** in the DB for each monthly entry:
- **Current accounts**: `Expenditure = Withdrawals` (all money leaving a current account is spending or transfers - since we no longer distinguish, this is the simple default. Users who entered Income can get Savings = Income - Expenditure.)
- **Credit Card accounts**: `Expenditure = New Charges` (all charges are spending)
- **Other accounts**: Expenditure = 0

Storing it explicitly means we have a durable historical record even if the derivation logic evolves. The system computes it on save, so users never enter it manually.

**What gets removed from the UI (columns kept in DB):**
- `internalTransfersOut` - no longer shown. Transfers between accounts show up as a Withdrawal from one and a Contribution to another. Nets to zero in net worth.
- `debtPayments` - no longer shown. A credit card payment is a Withdrawal from Current and a Payment Made to Credit Card. Nets to zero.
- `cashIn` / `cashOut` - reused under the hood. The DB columns `cash_in` and `cash_out` continue to store the data; only the UI labels change to Contributions/Withdrawals (and per-type variants).

**Old columns are kept in the database** with their existing data intact. They simply stop being shown in the UI. This means zero data loss and easy rollback if anything breaks. Column cleanup (renaming or dropping) is deferred to a final phase only after everything is stable.

### Account Creation: Simplify Too

**Current (6 fields) -> Proposed (4 fields):**

| Field | Keep/Drop | Reason |
|-------|-----------|--------|
| Account Name | **Keep** | Essential |
| Account Type | **Keep** | All 11 types preserved |
| Currency | **Keep** | Essential for multi-currency |
| Owner | **Keep** | Useful for household tracking |
| Category (Cash/Investments) | **Drop from form** | Auto-derived from Account Type (column kept in DB) |
| ISA | **Move to account settings** | Niche, clutters the creation form |

**Auto-derive Category from Type:**

| Type | Auto-Category |
|------|---------------|
| Current, Savings, Credit Card, Loan | Cash |
| Investment, Stock, Crypto, Pension, Commodity, Stock Options, Asset | Investments |

**ISA** becomes an optional toggle on the account detail/edit page, not a creation-time field.

### All 11 Account Types Preserved

No consolidation. All types remain as-is:

Current, Savings, Investment, Stock, Crypto, Pension, Commodity, Stock Options, Credit Card, Loan, Asset

The input experience is identical across types (Ending Balance + Contributions + Withdrawals), except Current accounts also show Income. Types drive labelling in charts and automatic growth categorisation.

## What the Monthly Entry Form Looks Like

### Before (Current Account - 7 fields)
```
Ending Balance:          [________]
Income:                  [________]
Internal Transfers Out:  [________]
Debt Payments:           [________]
Expenditure (Computed):  [________] (disabled)
Cash In:                 [________]
Cash Out:                [________]
```

### After (Current Account - 4 fields)
```
Ending Balance:    [________]
Income:            [________]
Deposits:          [________]
Withdrawals:       [________]
```

### Before (Investment - 3 fields)
```
Ending Balance:    [________]
Cash In:           [________]
Cash Out:          [________]
```

### After (Investment - 3 fields)
```
Ending Balance:    [________]
Contributions:     [________]
Withdrawals:       [________]
```

### After (Credit Card - 3 fields)
```
Ending Balance:    [________]
Payments Made:     [________]
New Charges:       [________]
```

### After (Loan - 3 fields)
```
Ending Balance:    [________]
Payments Made:     [________]
New Drawdowns:     [________]
```

## Schema Changes

### `monthlyEntries` table

| Column | Action | Notes |
|--------|--------|-------|
| `ending_balance` | **Keep** | Core data |
| `cash_in` | **Keep column, relabel in UI** | Stores contributions/deposits/payments. No DB change. |
| `cash_out` | **Keep column, relabel in UI** | Stores withdrawals/charges/drawdowns. No DB change. |
| `income` | **Keep** | For current accounts |
| `expenditure` | **Keep, auto-compute on save** | Stored explicitly but computed from other fields, not user-entered |
| `internal_transfers_out` | **Keep column, stop writing to it** | New entries write 0. Old data preserved. |
| `debt_payments` | **Keep column, stop writing to it** | New entries write 0. Old data preserved. |

### `financialAccounts` table

| Column | Action | Notes |
|--------|--------|-------|
| `category` | **Keep column, auto-populate** | Derived from type on create/update. Column stays in DB. |
| `is_isa` | **Keep column** | Remove from creation form, show in account edit/settings. |

### No columns dropped. No renames. Zero-migration for Phase 1.

## Migration Strategy

1. **Phase 1 - UI changes only (no DB migration)**:
   - Update monthly entry form: show Ending Balance, Contributions (mapped to `cash_in`), Withdrawals (mapped to `cash_out`), Income (Current only). Use per-type labels.
   - Remove Internal Transfers Out, Debt Payments, and computed Expenditure from the form.
   - Auto-compute `expenditure` on save (Current: Withdrawals, Credit Card: New Charges, others: 0).
   - Write 0 to `internal_transfers_out` and `debt_payments` for new entries.
   - Update account creation form: remove Category (auto-derive), move ISA to account edit page.
   - Auto-set `category` based on account type when creating/updating accounts.

2. **Phase 2 - Update metrics & charts**:
   - Update `getFinancialMetrics()` to use the new expenditure derivation.
   - Update growth attribution to use new contribution/withdrawal fields.
   - Update chart labels and legends to use new terminology.
   - Update field explanations (`field-explanations.ts`) for new labels.

3. **Phase 3 - Schema cleanup (deferred, only after stable)**:
   - Consider renaming `cash_in` -> `contributions`, `cash_out` -> `withdrawals` at DB level.
   - Consider dropping `internal_transfers_out` and `debt_payments` columns.
   - Only do this once confident no rollback is needed.

## Impact on Existing Features

| Feature | Impact |
|---------|--------|
| Net worth calculation | No change - still sum of balances |
| Net worth chart | No change |
| Income tracking | Simplified - still user-entered on Current accounts |
| Expenditure tracking | Still stored explicitly, but computed differently (simpler derivation) |
| Savings rate | Same formula: (Income - Expenditure) / Income |
| Growth attribution (interest, capital gains) | Improved - cleaner derivation from balance changes |
| Projections | No change - uses growth rates and balances |
| Account sections/grouping | Auto-category instead of user-selected |
| CSV export | Update column display names, underlying data unchanged |
| Historical data | Fully preserved - no columns dropped, old values intact |
