# Proposal: Simplify Charts

## Problem

There are currently 9 chart types, many overlapping:

| Current Chart | What it shows |
|---|---|
| Net Worth | Stacked area by account type over time |
| Assets vs Liabilities | Assets (green) vs liabilities (red) with net worth line |
| By Account | Horizontal bar of individual account balances |
| By Wealth Source | Area chart: Savings from Income, Interest Earned, Capital Gains |
| Monthly Growth Rate | Bar chart of month-over-month % growth |
| Asset Allocation | Pie chart by account type or category |
| Waterfall | Waterfall showing starting balance + savings + interest + gains = ending |
| Savings Rate | Savings rate % line with income/expenditure |
| Projection | Projected future net worth from scenarios |

**Overlap:** Assets vs Liabilities is a subset of Net Worth. Waterfall and By Wealth Source show the same data differently. Monthly Growth Rate is niche. By Account is rarely actionable.

## What You Actually Want to Know

1. **What is my net worth and how is it split?** (monthly, by account type)
2. **How much am I saving vs spending?** (savings rate %, monthly expenditure)
3. **What drove the change?** (income saved, capital gains, interest)
4. **What's my allocation?** (% split across account types)

These map to **4 core charts**, plus Projection as an optional 5th.

---

## Proposed Charts

### Chart 1: Net Worth (keep, enhance)

**What it answers:** "What is my net worth and how is it split by account type?"

- Stacked area chart, one colour per account type
- Toggle: **Absolute values** vs **% composition** (existing feature)
- Default view: absolute values
- Header cards: total net worth + breakdown by account type
- Click-to-pin a month to inspect

**Absorbs:** Assets vs Liabilities (remove as separate chart — the same data is visible here, liabilities already show as negative), By Account (remove — low value, individual balances visible in account table)

### Chart 2: Income & Spending

**What it answers:** "How much did I earn, spend, and save each month?"

Replaces the current Savings Rate chart with a more useful combined view.

- **Bar chart** with two series:
  - Income (green bars)
  - Expenditure (red bars)
- **Line overlay**: Savings Rate % (right Y-axis)
- Header cards: Latest month income, expenditure, savings, savings rate %
- Hover/click shows month detail

**Why combine?** Seeing absolute income and spending alongside the savings rate % gives much more context than the savings rate alone. A 50% savings rate means very different things at different income levels.

### Chart 3: Net Worth Changes (rename from "By Wealth Source")

**What it answers:** "What drove the change in my net worth this month?"

- **Stacked bar chart** (monthly, not cumulative) showing:
  - Savings from Income (green)
  - Interest Earned (blue)
  - Capital Gains/Losses (purple)
- Each bar = total net worth change for that month
- Negative months show bars going below zero
- Header cards: breakdown of latest month's change by source
- Toggle: **Monthly** vs **Cumulative** (existing feature)

**Absorbs:** Waterfall (remove — the waterfall shows the same breakdown for a single month, but the stacked bar shows it for all months at once. Click-to-pin already lets you inspect a single month's breakdown in the header cards). Monthly Growth Rate (remove — niche, and the same insight is visible from this chart's bar heights).

### Chart 4: Allocation (keep, simplify)

**What it answers:** "What % of my net worth is in each account type?"

- **Donut chart** showing % split by account type
- Shows latest month by default, with month selector for historical view
- Header cards: each account type with % and absolute value
- Remove the "view by category" toggle (category is auto-derived from type now, so the two views are redundant)

### Chart 5: Projection (keep as-is)

**What it answers:** "Where will my net worth be in X years?"

- Stacked area chart projecting future net worth
- Scenario-based (existing feature)
- No changes needed

---

## Summary: Before & After

| Before (9 charts) | After (5 charts) | Status |
|---|---|---|
| Net Worth | **Net Worth** | Keep, enhanced |
| Assets vs Liabilities | — | Remove (absorbed into Net Worth) |
| By Account | — | Remove (low value, data in accounts table) |
| By Wealth Source | **Net Worth Changes** | Rename, default to monthly view |
| Monthly Growth Rate | — | Remove (absorbed into Net Worth Changes) |
| Allocation | **Allocation** | Keep, remove category toggle |
| Waterfall | — | Remove (absorbed into Net Worth Changes) |
| Savings Rate | **Income & Spending** | Replace with richer combined chart |
| Projection | **Projection** | Keep as-is |

**Dropdown order:**
1. Net Worth
2. Income & Spending
3. Net Worth Changes
4. Allocation
5. Projection

---

## Other Charts to Consider

### A. Income Breakdown (future, not for now)

If you add multiple income sources (side income, rental income), a stacked bar showing income by source over time would be valuable. Not needed until income tracking is richer.

### B. Debt Paydown (future, not for now)

If you have significant liabilities (mortgage, loans), a chart showing total debt decreasing over time with payoff date projection. Only useful when liability tracking is more detailed.

### C. FX Impact (future, not for now)

For multi-currency portfolios, showing how much of your net worth change was from FX movements vs actual growth. Requires storing historical FX rates per entry, which the system already does.

---

## Implementation Notes

### What gets deleted
- `assets-vs-liabilities` rendering in chart-display.tsx
- `by-account` rendering in chart-display.tsx
- `monthly-growth-rate` rendering in chart-display.tsx
- `waterfall` rendering in chart-display.tsx
- Corresponding sections in chart-header.tsx, data-details-panel.tsx
- Chart type options removed from chart-type-selector.tsx

### What gets modified
- `savings-rate` → renamed to `income-spending`, reworked to show income + expenditure bars with savings rate line overlay
- `by-wealth-source` → renamed to `net-worth-changes`, default to monthly view (not cumulative)
- `allocation` → remove "view by category" toggle
- `ChartType` union type in types.ts simplified to 5 options

### What stays unchanged
- `total` (Net Worth) — works well as-is
- `projection` — works well as-is
- All data fetching in `getChartData()` — no server changes needed
- Chart controls infrastructure (time period, account filters, click-to-pin)
- Currency conversion, data masking, responsive layout

### Estimated scope
This is primarily a deletion exercise. The only new work is the Income & Spending chart (combining income/expenditure bars with savings rate line). Everything else is removing code and updating the chart type selector.
