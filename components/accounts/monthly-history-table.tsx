import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthlyHistoryRow } from "./monthly-history-row";
import { type MonthlyEntry } from "@/lib/types";

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
      }
    >
  >;
  accountId: string;
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
  onValueChange,
  onSave,
  onEdit,
}: MonthlyHistoryTableProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No monthly data yet.</p>
        <p className="text-sm">
          Use the &quot;Add Month&quot; button to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile History Layout */}
      <div className="block sm:hidden space-y-3">
        {history.map((entry) => {
          const isEditing =
            editingValues[accountId]?.[entry.monthKey] !== undefined;

          return (
            <MonthlyHistoryRow
              key={entry.monthKey}
              entry={entry}
              isEditing={isEditing}
              editingValues={
                isEditing
                  ? editingValues[accountId][entry.monthKey]
                  : {
                      endingBalance: entry.endingBalance.toString(),
                      cashIn: entry.cashIn.toString(),
                      cashOut: entry.cashOut.toString(),
                    }
              }
              onValueChange={(field, value) =>
                onValueChange(accountId, entry.monthKey, field, value)
              }
              onSave={() => onSave(accountId, entry.monthKey)}
              onEdit={() => onEdit(accountId, entry.monthKey, entry)}
              isMobile
            />
          );
        })}
      </div>

      {/* Desktop History Layout */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Cash In</TableHead>
              <TableHead>Cash Out</TableHead>
              <TableHead>Cash Flow</TableHead>
              <TableHead>Growth</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => {
              const isEditing =
                editingValues[accountId]?.[entry.monthKey] !== undefined;

              return (
                <MonthlyHistoryRow
                  key={entry.monthKey}
                  entry={entry}
                  isEditing={isEditing}
                  editingValues={
                    isEditing
                      ? editingValues[accountId][entry.monthKey]
                      : {
                          endingBalance: entry.endingBalance.toString(),
                          cashIn: entry.cashIn.toString(),
                          cashOut: entry.cashOut.toString(),
                        }
                  }
                  onValueChange={(field, value) =>
                    onValueChange(accountId, entry.monthKey, field, value)
                  }
                  onSave={() => onSave(accountId, entry.monthKey)}
                  onEdit={() => onEdit(accountId, entry.monthKey, entry)}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
