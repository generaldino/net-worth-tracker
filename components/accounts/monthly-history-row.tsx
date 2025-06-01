import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Save } from "lucide-react";
import { type MonthlyEntry } from "@/lib/types";

interface MonthlyHistoryRowProps {
  entry: MonthlyEntry;
  isEditing: boolean;
  editingValues: {
    endingBalance: string;
    cashIn: string;
    cashOut: string;
  };
  onValueChange: (field: string, value: string) => void;
  onSave: () => void;
  onEdit: () => void;
  isMobile?: boolean;
}

export function MonthlyHistoryRow({
  entry,
  isEditing,
  editingValues,
  onValueChange,
  onSave,
  onEdit,
  isMobile = false,
}: MonthlyHistoryRowProps) {
  if (isMobile) {
    return (
      <div className="bg-muted/30 rounded-lg p-3">
        <div className="flex justify-between items-start mb-2">
          <div className="font-medium">{entry.month}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={isEditing ? onSave : onEdit}
          >
            {isEditing ? (
              <Save className="h-4 w-4" />
            ) : (
              <Edit className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Balance:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.endingBalance}
                onChange={(e) => onValueChange("endingBalance", e.target.value)}
                className="mt-1"
              />
            ) : (
              <div className="font-medium">
                £{entry.endingBalance.toLocaleString()}
              </div>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Growth:</span>
            <div
              className={
                entry.accountGrowth >= 0
                  ? "text-green-600 font-medium"
                  : "text-red-600 font-medium"
              }
            >
              {entry.accountGrowth >= 0 ? "+" : ""}£
              {entry.accountGrowth.toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Cash In:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.cashIn}
                onChange={(e) => onValueChange("cashIn", e.target.value)}
                className="mt-1"
              />
            ) : (
              <div className="font-medium">
                £{entry.cashIn.toLocaleString()}
              </div>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Cash Out:</span>
            {isEditing ? (
              <Input
                type="number"
                value={editingValues.cashOut}
                onChange={(e) => onValueChange("cashOut", e.target.value)}
                className="mt-1"
              />
            ) : (
              <div className="font-medium">
                £{entry.cashOut.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr>
      <td>{entry.month}</td>
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.endingBalance}
            onChange={(e) => onValueChange("endingBalance", e.target.value)}
            className="w-[120px]"
          />
        ) : (
          `£${entry.endingBalance.toLocaleString()}`
        )}
      </td>
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.cashIn}
            onChange={(e) => onValueChange("cashIn", e.target.value)}
            className="w-[100px]"
          />
        ) : (
          `£${entry.cashIn.toLocaleString()}`
        )}
      </td>
      <td>
        {isEditing ? (
          <Input
            type="number"
            value={editingValues.cashOut}
            onChange={(e) => onValueChange("cashOut", e.target.value)}
            className="w-[100px]"
          />
        ) : (
          `£${entry.cashOut.toLocaleString()}`
        )}
      </td>
      <td className={entry.cashFlow >= 0 ? "text-green-600" : "text-red-600"}>
        {entry.cashFlow >= 0 ? "+" : ""}£{entry.cashFlow.toLocaleString()}
      </td>
      <td
        className={entry.accountGrowth >= 0 ? "text-green-600" : "text-red-600"}
      >
        {entry.accountGrowth >= 0 ? "+" : ""}£
        {entry.accountGrowth.toLocaleString()}
      </td>
      <td>
        {isEditing ? (
          <Button variant="outline" size="sm" onClick={onSave}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}
