import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MonthlyHistoryRow } from "./monthly-history-row";
import { type MonthlyEntry } from "@/lib/types";
import { updateMonthlyEntry } from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";

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
      } catch (error) {
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
              onSave={() => handleSave(entry.monthKey)}
              onEdit={() => onEdit(accountId, entry.monthKey, entry)}
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
              <TableHead className="w-[140px]">Balance</TableHead>
              <TableHead className="w-[120px]">Cash In</TableHead>
              <TableHead className="w-[120px]">Cash Out</TableHead>
              <TableHead className="w-[120px]">Cash Flow</TableHead>
              <TableHead className="w-[120px]">Growth</TableHead>
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
                  onSave={() => handleSave(entry.monthKey)}
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
