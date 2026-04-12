# Spec: Dashboard Refactor — Charts Grid + Dedicated Accounts Page

A deletion-heavy refactor. Net result: ~2,000 fewer lines, one screen that answers "how am I doing?" at a glance, accounts on their own route.

## Goals

1. Move the accounts table off the main page onto a dedicated `/accounts` route.
2. Replace the chart-type switcher with a **dashboard grid** that renders all charts at once.
3. **Remove projections** end-to-end (UI, contexts, server actions, API routes). DB tables stay only because dropping them needs a migration — that's a separate phase.
4. Replace per-chart breakdown cards with **inline series labels + a rich pinned tooltip** on each chart. Headline KPIs already live in the navbar.
5. Unify the period concept: **one selector drives both the navbar KPIs and the charts.**

## Non-goals

- No changes to the chart visuals themselves (only their containers and the surrounding chrome).
- No schema migrations. Scenario tables stay; their CRUD goes.
- No redesign of auth, sharing, or theme.

---

## 1. Routing & navigation

### New route: `/accounts`

- `app/accounts/page.tsx` — server component, mirrors the auth check from `app/page.tsx:1-30`, renders `<NewAccountsSectionWrapper />` inside `<DashboardProviders>`.
- `NewAccountsSectionWrapper` is already self-contained: it fetches its own data and only consumes `MaskingProvider` / `DisplayCurrencyProvider` / `useCurrencyConversion`. Confirmed safe to drop into a new route as-is.

### Sidebar nav

`components/app-sidebar.tsx:50-66` — add an `Accounts` entry between Dashboard and Share Dashboard, icon `Wallet` from `lucide-react`.

### Main page (`/`)

After this PR, `app/page.tsx` renders `<DashboardGrid />` only — accounts are gone from the home route. If the user has no data (see §6), it renders an onboarding empty state inside the same `DashboardProviders` shell — **not a redirect** (preserves back-button, lets users see what they're building toward).

### Extract `DashboardProviders`

Today, providers are inlined in `components/dashboard-shell.tsx:43-106`. Pull them into a new `components/dashboard-providers.tsx` so `/` and `/accounts` share the exact same provider tree without duplication.

---

## 2. Charts as a dashboard grid

### Charts to keep (4)

| Chart | New file |
|---|---|
| Net Worth | `components/charts/net-worth-chart.tsx` |
| Income & Spending | `components/charts/income-spending-chart.tsx` |
| Net Worth Changes | `components/charts/net-worth-changes-chart.tsx` |
| Asset Allocation | `components/charts/asset-allocation-chart.tsx` |

### Split `chart-display.tsx` (THE refactor)

`components/charts/chart-display.tsx` is 1,716 lines with five `case` blocks dispatching on `chartType`. With the switcher gone, this dispatch is dead weight. **Split it per chart**, one file each. Shared helpers (constants, color maps, formatters, the hover-state machine) move to `components/charts/chart-shared.ts`.

After the split, the `chartType` prop and the ~13 `chartType ===` branches in the hover logic (`chart-display.tsx:198, 237, 256, 273, 328, 341, 351, 363, 392, 429, 446, 477, 492`) all disappear.

This is the largest single win in the refactor — do not skip it.

### Layout

```
(navbar — sticky, shows Net Worth / Earned / Spent / Saved + period selector + currency + mask)
┌──────────────────────────────────────────────────┐
│  Net Worth — HERO (full width, ~320px tall)      │
├──────────────────────────────────────────────────┤
│  Income & Spending (full width)                  │
├──────────────────────────┬───────────────────────┤
│  Net Worth Changes       │  Asset Allocation     │
└──────────────────────────┴───────────────────────┘
```

- Order is **Net Worth → Income & Spending → Changes + Allocation**. Income & Spending is the behavior-changing chart, so it sits high.
- Net Worth is the hero: bigger title type, the current value rendered inline next to the title at a larger weight than the other three charts. It is **the** number.
- Each chart lives in its own `<Card>` with a thin header: title + current value (Net Worth only) + tiny per-chart controls (Allocation has a month picker).
- Hero chart height: ~320px so the second row stays above the fold on a 13" laptop. The original spec's 420px pushed everything below the fold.

### Asset Allocation: horizontal stacked bar, not a pie

A half-width pie is unreadable. Render Allocation as a single horizontal stacked bar with inline labels per segment. It animates cleanly, scales to many account types, and the breakdown is its own legend. (Copilot Money and Monarch dropped pies for the same reason.)

The chart still answers the same question. Keep the month picker.

### Mobile

Below `lg`, the four charts collapse into a horizontal **snap-scroll carousel** with page dots, not a vertical stack. Stacking four 320px charts produces a scroll-of-death and kills the "one-screen overview" idea. The navbar's existing mobile metrics block (`navbar.tsx:120-152`) stays pinned above the carousel.

### Period selector — unified

The screen has **one** time-period control, lives in the navbar next to the KPIs:

```
1M  3M  6M  YTD  1Y  All
```

It drives both the navbar's headline KPIs and every chart in the grid via a single `period` URL state key. Today the navbar uses `metrics=ytd|alltime` (`navbar.tsx:82-106`); collapse those into the new selector by treating `YTD` and `All` as two of its presets. The old `metrics` URL key is removed.

Two competing time scopes on one screen is a "why don't these match?" bug. Don't ship it.

---

## 3. Headers, legends, and the cards problem

### Delete `chart-header.tsx`

`components/charts/chart-header.tsx` is 669 lines of one component branching on five chart types to render five different layouts with five different color maps and five different "adjusted total" calculations. With the grid, every chart is its own component — there is nothing for a shared header to do. **Delete the file.** Each chart owns its own ~10-line title row inline.

### No `useChartLegend` hook

The reviews flagged this as a premature abstraction — a switch statement wearing a hat. Each chart already knows the shape of its own breakdown; compute it inline (typically 5–15 lines per chart) where it renders. If duplication shows up later, extract then.

### Inline series labels + rich tooltip (the new pattern)

Instead of card strips above the chart, use the Linear/Mercury idiom:

- **Series labels rendered inline at the right edge of the chart**, next to the last data point. Color swatch + label. No interaction.
- **Rich tooltip on hover and on tap-pin** that shows the full breakdown for that month — values, color swatches, percent of total. This is where users actually want the breakdown.
- **No "click to hide series" toggle in the header.** It's a power-user feature that's fiddly on desktop and unusable on mobile. If it survives at all, hide it behind a `…` overflow menu on the chart card. Default: drop it. Add it back only if a user complains.

### Income & Spending special case

Its breakdown is Income / Expenditure / Savings — **already in the navbar**. Don't duplicate. The chart's bars are self-explanatory; render only a small "vs last year" delta chip in the header so visual parity with the other three cards is preserved.

### What gets deleted

- `components/sample-card.tsx` (`NetWorthCards`) — delete
- `components/charts/chart-header.tsx` — delete
- `components/charts/controls/chart-type-selector.tsx` — delete

---

## 4. State migration

| Key | Where it lives now | Where it lives after |
|---|---|---|
| `chart` (URL) | `chart-controls.tsx:59-63` | **deleted** |
| `metrics` (URL, navbar) | `navbar.tsx:23` | **deleted, folded into `period`** |
| `period` (URL) | `chart-controls.tsx` | navbar, drives KPIs + all charts |
| Per-chart view toggles (absolute/percent, etc.) | URL via `useUrlState` | `useState` inside each chart |
| `allocMonth` | URL | `useState` inside `<AssetAllocationChart />` |

Per-chart view toggles do **not** belong in URL state. Nobody deep-links "Net Worth in percentage mode." Five URL params on one page is cargo-cult from the old switcher era.

### Delete `chart-controls.tsx` (617 lines)

After projection removal, ~80% of this file is dead:

- All projection plumbing (`calculateProjectionForScenario`, preload refs, scenario effects, the `Collapsible` setup form)
- `useTransition` (existed only to smooth chart-type switching)
- A `useEffect` gated on `hasFiltersChanged = false` (`chart-controls.tsx:403`) that never runs

Replace with a ~60-line `<PeriodSelector />` + a currency conversion `useMemo`. Mount the period selector inside the navbar.

---

## 5. Removing projections — the deeper cut

The conservative version of this cut leaves dead server actions importing scenario types. They will rot. **Cut deeper:**

**Delete:**
- `components/projections/` (entire folder, 4 files)
- `contexts/projection-context.tsx`
- All server actions: `getProjectionScenarios`, `calculateProjection`, scenario CRUD
- Any `/api/projections` routes
- `lib/projection-*.ts` if present
- Scenario TypeScript types
- `"projection"` from the `ChartType` union in `components/charts/types.ts`
- `getProjectionScenarios` fetch in `components/charts/chart-section.tsx:7` (this still runs today)
- `ProjectionProvider` from the providers chain
- All projection branches in `chart-display.tsx`, `chart-header.tsx` (the latter file is being deleted entirely anyway)

**Keep (for now):**
- DB tables (`scenarios`, etc.) and their Drizzle schema entries

A follow-up phase will drop the tables via a real migration. That phase has zero UI impact and should not block this PR.

---

## 6. Empty state on `/`

### Detection

Add a tiny server action: `hasAnyData(userId)` → `SELECT 1 FROM monthly_entries WHERE user_id = ? LIMIT 1`. Cheap, no caching needed.

**Don't** use `calculateNetWorth() === 0` — a user with all-zero accounts is a valid state. **Don't** reuse `getChartData` — it's the most expensive query in the app.

### Behavior

- `hasAnyData === false` → render an onboarding empty state inside `<DashboardGrid />`: a single illustration, headline ("Track your net worth"), and one CTA button → `/accounts`. Sidebar and navbar still render.
- `hasAnyData === true` → render the grid normally.

No redirect. Redirects break back-button navigation and hide the product from new users.

---

## 7. Suspense, errors, loading

- **One Suspense boundary** wraps the whole grid (matching today's `dashboard-shell.tsx:116-118`). All four charts share the same `getChartData` call, so splitting boundaries gains nothing and fragments the skeleton. State this explicitly so the next person doesn't over-engineer it.
- **Per-chart `<ErrorBoundary>`** around each chart card. Today, one bad chart kills the whole chart area. With four charts, isolate failures so a recharts regression in Allocation doesn't blank Net Worth.
- **Per-chart empty states** for the case where the user has accounts but no data for a specific chart (e.g., no income entries yet). Each chart's empty state has a one-line CTA pointing to `/accounts`.
- **Loading skeleton** stays as today: a single grid-shaped skeleton matches the new layout.

---

## 8. File-by-file change list

### New
- `app/accounts/page.tsx`
- `components/dashboard-providers.tsx` (extracted from `dashboard-shell.tsx:43-106`)
- `components/charts/dashboard-grid.tsx`
- `components/charts/net-worth-chart.tsx`
- `components/charts/income-spending-chart.tsx`
- `components/charts/net-worth-changes-chart.tsx`
- `components/charts/asset-allocation-chart.tsx`
- `components/charts/chart-shared.ts`
- `components/charts/period-selector.tsx`

### Modified
- `app/page.tsx` — render `<DashboardGrid />` (or empty state) only
- `components/dashboard-shell.tsx` — providers extracted; this file shrinks
- `components/app-sidebar.tsx:50-66` — add Accounts nav item
- `components/navbar.tsx` — mount the unified `<PeriodSelector />`, drop the YTD/All Time buttons
- `components/sample-navbar.tsx` (`FinancialMetricsNavbar`) — accept the new period prop, drop the binary period
- `components/charts/types.ts` — remove `"projection"` from `ChartType`

### Deleted
- `components/charts/chart-display.tsx` (replaced by 4 per-chart files + `chart-shared.ts`)
- `components/charts/chart-header.tsx`
- `components/charts/chart-controls.tsx` (mostly dead; replaced by `period-selector.tsx`)
- `components/charts/chart-section.tsx` (still fetches `getProjectionScenarios` today)
- `components/charts/controls/chart-type-selector.tsx`
- `components/sample-card.tsx`
- `components/projections/` (entire folder)
- `contexts/projection-context.tsx`
- `lib/projection-*.ts` (if present)
- All projection server actions and API routes

### Untouched (intentionally)
- `components/accounts-table.tsx`, `components/new-accounts-section.tsx`, `components/new-accounts-section-wrapper.tsx` — moved, not changed
- DB schema (scenario tables stay until follow-up migration)
- Auth, sharing, documentation routes

---

## 9. Accessibility, animation, polish

- Period selector buttons: `aria-pressed` state, keyboard focus rings.
- Tooltip is keyboard-reachable (focus the chart, arrow keys move the cursor — recharts supports this with `accessibilityLayer`).
- Verify the navbar's emerald/red YoY badges (`sample-navbar.tsx:293-294`) hit WCAG AA on the blurred `bg-background/60` background in dark mode.
- When the period selector changes, charts crossfade rather than hard-swap (~20 lines of Framer Motion). Cheap; makes the dashboard feel premium.

---

## 10. Resolved decisions (from prior review)

1. **Mobile:** fully responsive. Snap-scroll carousel for charts; navbar metrics wrap to 2x2 on tablet.
2. **Empty state on `/`:** onboarding state, not a redirect.
3. **Scenario DB tables:** kept for now, dropped in a separate migration phase.
4. **Hover/pinned month state:** kept per-chart, drives the rich tooltip.
5. **Period concept:** unified into one selector in the navbar.
6. **Cards:** deleted entirely, replaced by inline series labels + tooltip.

---

## 11. Rollout

One PR, structured as five clean commits so review is bisectable:

1. Delete projections end-to-end (UI, context, server actions, API routes, types)
2. Split `chart-display.tsx` into four per-chart files + `chart-shared.ts`
3. Delete `chart-header.tsx`, `sample-card.tsx`, `chart-controls.tsx`; add `<PeriodSelector />`; unify period state
4. Add `dashboard-grid.tsx`; extract `dashboard-providers.tsx`; rewire `app/page.tsx`
5. Add `/accounts` route + sidebar entry

### Manual test plan

- Load `/` (with data) → navbar with unified period selector, 4 charts in grid, no switcher, no projection, no card strips above charts.
- Load `/` (no data) → onboarding empty state with a CTA to `/accounts`. Back button still works.
- Change period in navbar → both navbar KPIs and all 4 charts update together.
- Hover Net Worth chart → rich tooltip shows full breakdown; series labels at the right edge stay visible.
- Force one chart to throw → its `<ErrorBoundary>` shows an error card; other 3 charts still render.
- Resize to mobile → charts become a snap-scroll carousel; navbar metrics still visible at top.
- Navigate to `/accounts` → existing accounts table renders; filters, edit, archive, drag-reorder, monthly-entry flows all work.
- Sidebar shows Dashboard / Accounts / Share / Documentation.
- Grep for dead imports — should return zero hits:
  - `ProjectionProvider`, `projection-context`, `NetWorthCards`, `chart-type-selector`
  - `chart-header`, `chart-controls`, `chart-display`, `chart-section`, `sample-card`
  - `getProjectionScenarios`, `calculateProjection`
  - `metrics=` URL key
