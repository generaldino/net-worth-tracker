import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthlyHistoryRow } from "./monthly-history-row";
import { type MonthlyEntry, type AccountType } from "@/lib/types";
import { updateMonthlyEntry } from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";
import type { Currency } from "@/lib/fx-rates";
import { shouldShowIncomeExpenditure } from "@/lib/account-helpers";
import { getFieldExplanation } from "@/lib/field-explanations";
import { InfoButton } from "@/components/ui/info-button";

interface MonthlyHistoryTableProps {
  history: MonthlyEntry[];
  editingValues: Record<
    string,
    Record<
      string,
      {
        endingBalance: string;
        cashIn: string;
        cashOut: string;
        income: string;
        expenditure: string;
      }
    >
  >;
  accountId: string;
  accountType: AccountType;
  accountCurrency: Currency;
  displayCurrency: Currency;
  onValueChange: (
    accountId: string,
    month: string,
    field: string,
    value: string
  ) => void;
  onSave: (accountId: string, month: string) => void;
  onEdit: (accountId: string, month: string, entry: MonthlyEntry) => void;
}

export function MonthlyHistoryTable({
  history,
  editingValues,
  accountId,
  accountType,
  accountCurrency,
  displayCurrency,
  onValueChange,
  onSave,
  onEdit,
}: MonthlyHistoryTableProps) {
  const showIncomeExpenditure = shouldShowIncomeExpenditure(accountType);
  if (history.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 text-muted-foreground">
        <p>No monthly data yet.</p>
        <p className="text-sm mt-1">
          Use the &quot;Add Month&quot; button to get started.
        </p>
      </div>
    );
  }

  const handleSave = async (month: string) => {
    const editedEntry = editingValues[accountId]?.[month];
    if (editedEntry) {
      try {
        const result = await updateMonthlyEntry(accountId, month, {
          endingBalance: Number.parseFloat(editedEntry.endingBalance) || 0,
          cashIn: Number.parseFloat(editedEntry.cashIn) || 0,
          cashOut: Number.parseFloat(editedEntry.cashOut) || 0,
          income: showIncomeExpenditure
            ? Number.parseFloat(editedEntry.income) || 0
            : 0,
          expenditure: showIncomeExpenditure
            ? Number.parseFloat(editedEntry.expenditure) || 0
            : 0,
        });

        if (result.success) {
          onSave(accountId, month);
          toast({
            title: "Success",
            description: "Monthly entry updated successfully",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: result.error || "Failed to update monthly entry",
          });
        }
      } catch {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        });
      }
    }
  };

  return (
    <>
      {/* Mobile History Layout */}
      <div className="block sm:hidden space-y-3">
        {history.map((entry) => {
          const isEditing =
            editingValues[accountId]?.[entry.month] !== undefined;

          return (
            <MonthlyHistoryRow
              key={entry.month}
              entry={entry}
              isEditing={isEditing}
              showIncomeExpenditure={showIncomeExpenditure}
              accountType={accountType}
              accountCurrency={accountCurrency}
              displayCurrency={displayCurrency}
              editingValues={
                isEditing
                  ? editingValues[accountId][entry.month]
                  : {
                      endingBalance: entry.endingBalance.toString(),
                      cashIn: entry.cashIn.toString(),
                      cashOut: entry.cashOut.toString(),
                      income: (entry.income || 0).toString(),
                      expenditure: (entry.expenditure || 0).toString(),
                    }
              }
              onValueChange={(field, value) =>
                onValueChange(accountId, entry.month, field, value)
              }
              onSave={() => handleSave(entry.month)}
              onEdit={() => onEdit(accountId, entry.month, entry)}
              isMobile
            />
          );
        })}
      </div>

      {/* Desktop History Layout */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Month</TableHead>
              <TableHead className="w-[140px]">
                <div className="flex items-center gap-1">
                  Balance
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "endingBalance"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
              </TableHead>
              {showIncomeExpenditure && (
                <>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center gap-1">
                      Income
                      {(() => {
                        const explanation = getFieldExplanation(
                          accountType,
                          "income"
                        );
                        return explanation ? (
                          <InfoButton
                            title={explanation.title}
                            description={explanation.description}
                          />
                        ) : null;
                      })()}
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center gap-1">
                      Expenditure
                      {(() => {
                        const explanation = getFieldExplanation(
                          accountType,
                          "expenditure"
                        );
                        return explanation ? (
                          <InfoButton
                            title={explanation.title}
                            description={explanation.description}
                          />
                        ) : null;
                      })()}
                    </div>
                  </TableHead>
                </>
              )}
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-1">
                  Cash In
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "cashIn"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-1">
                  Cash Out
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "cashOut"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-1">
                  Cash Flow
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "cashFlow"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
              </TableHead>
              <TableHead className="w-[120px]">
                <div className="flex items-center gap-1">
                  Growth
                  {(() => {
                    const explanation = getFieldExplanation(
                      accountType,
                      "accountGrowth"
                    );
                    return explanation ? (
                      <InfoButton
                        title={explanation.title}
                        description={explanation.description}
                      />
                    ) : null;
                  })()}
                </div>
              </TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => {
              const isEditing =
                editingValues[accountId]?.[entry.month] !== undefined;

              return (
                <MonthlyHistoryRow
                  key={entry.month}
                  entry={entry}
                  isEditing={isEditing}
                  showIncomeExpenditure={showIncomeExpenditure}
                  accountType={accountType}
                  accountCurrency={accountCurrency}
                  displayCurrency={displayCurrency}
                  editingValues={
                    isEditing
                      ? editingValues[accountId][entry.month]
                      : {
                          endingBalance: entry.endingBalance.toString(),
                          cashIn: entry.cashIn.toString(),
                          cashOut: entry.cashOut.toString(),
                          income: (entry.income || 0).toString(),
                          expenditure: (entry.expenditure || 0).toString(),
                        }
                  }
                  onValueChange={(field, value) =>
                    onValueChange(accountId, entry.month, field, value)
                  }
                  onSave={() => handleSave(entry.month)}
                  onEdit={() => onEdit(accountId, entry.month, entry)}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
