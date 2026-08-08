import { BudgetView } from "@/components/budget/budget-view";
import { getCategories } from "@/app/actions/expense-categories";
import {
  getCategoryTotals,
  getExpenseMonths,
  getExpenses,
  getUncategorisedCount,
} from "@/app/actions/expenses";
import { getBudgetPageData } from "@/app/actions/budget";
import { getStatementCoverage } from "@/app/actions/statements";
import { getAccounts } from "@/lib/actions";

export const dynamic = "force-dynamic";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; import?: string }>;
}) {
  const params = await searchParams;

  const [categories, months, accounts] = await Promise.all([
    getCategories(),
    getExpenseMonths(),
    getAccounts(),
  ]);

  // Selected month: the URL param if valid, else the newest month with data,
  // else the current month.
  const requested =
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null;
  const month = requested ?? months[0] ?? currentMonth();

  // Always offer the current month even when it has no expenses yet.
  const monthOptions = Array.from(
    new Set([month, currentMonth(), ...months]),
  ).sort((a, b) => b.localeCompare(a));

  const [expenses, categoryTotals, uncategorisedCount, budgetData, coverage] =
    await Promise.all([
      getExpenses({ month }),
      getCategoryTotals(month),
      getUncategorisedCount(month),
      getBudgetPageData(month),
      getStatementCoverage(month),
    ]);

  // Deep link from the check-in: only honour ids that are real accounts.
  const autoImportAccountId =
    params.import && accounts.some((a) => a.id === params.import)
      ? params.import
      : null;

  return (
    <div className="min-h-[calc(100svh-56px)] bg-background overflow-x-hidden max-w-full">
      <div className="w-full max-w-5xl mx-auto py-4 px-4 sm:px-6">
        <BudgetView
          month={month}
          months={monthOptions}
          expenses={expenses}
          categories={categories}
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
          }))}
          categoryTotals={categoryTotals}
          uncategorisedCount={uncategorisedCount}
          incomeTotalGbp={budgetData.incomeTotalGbp}
          categoryAverages={budgetData.categoryAverages}
          history={budgetData.history}
          runway={budgetData.runway}
          spendTrackedSince={budgetData.spendTrackedSince}
          topMerchants={budgetData.topMerchants}
          categorySparklines={budgetData.categorySparklines}
          sparklineMonths={budgetData.sparklineMonths}
          coverage={coverage}
          autoImportAccountId={autoImportAccountId}
        />
      </div>
    </div>
  );
}
