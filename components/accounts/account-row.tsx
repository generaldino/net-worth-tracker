import { ChevronDown, ChevronRight } from "lucide-react";
import { type Account, type MonthlyEntry } from "@/lib/types";
import { AccountTypeBadge } from "./account-type-badge";
import { AccountActions } from "./account-actions";
import { ValueChangeDisplay } from "./value-change-display";
import { MonthlyHistoryTable } from "./monthly-history-table";
import { AddMonthDialog } from "@/components/add-month-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface AccountRowProps {
  account: Account;
  currentValue: number;
  valueChange: {
    absoluteChange: number;
    percentageChange: number;
  };
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
  monthlyData: Record<string, MonthlyEntry[]>;
  selectedTimePeriod: string;
  onValueChange: (
    accountId: string,
    month: string,
    field: string,
    value: string
  ) => void;
  onSave: (accountId: string, month: string) => void;
  onEdit: (accountId: string, month: string, entry: MonthlyEntry) => void;
  onAddMonth: (accountId: string, month: string, entry: MonthlyEntry) => void;
  onEditAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
}

export function AccountRow({
  account,
  currentValue,
  valueChange,
  history,
  editingValues,
  selectedTimePeriod,
  onValueChange,
  onSave,
  onEdit,
  onAddMonth,
  onEditAccount,
  onDeleteAccount,
}: AccountRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="border rounded-lg bg-card">
        <CollapsibleTrigger asChild>
          <div className="w-full p-4 hover:bg-muted/50 cursor-pointer">
            {/* Mobile Layout */}
            <div className="block sm:hidden">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mt-1" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-1" />
                  )}
                  <div>
                    <div className="font-medium text-base">{account.name}</div>
                    <div className="flex gap-2 mt-1">
                      <AccountTypeBadge account={account} />
                    </div>
                  </div>
                </div>
                <AccountActions
                  account={account}
                  onEdit={onEditAccount}
                  onDelete={onDeleteAccount}
                  stopPropagation
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Value:</span>
                  <div className="font-medium text-lg">
                    £{currentValue.toLocaleString()}
                  </div>
                </div>
                <ValueChangeDisplay
                  absoluteChange={valueChange.absoluteChange}
                  percentageChange={valueChange.percentageChange}
                  label={`${selectedTimePeriod} Change:`}
                />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <div className="grid grid-cols-6 gap-4 flex-1 items-center">
                  <div className="font-medium">{account.name}</div>
                  <div className="text-muted-foreground">{account.owner}</div>
                  <AccountTypeBadge account={account} />
                  <div className="font-medium">
                    £{currentValue.toLocaleString()}
                  </div>
                  <ValueChangeDisplay
                    absoluteChange={valueChange.absoluteChange}
                    percentageChange={valueChange.percentageChange}
                  />
                </div>
              </div>
              <AccountActions
                account={account}
                onEdit={onEditAccount}
                onDelete={onDeleteAccount}
                stopPropagation
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 border-t">
            <div className="flex justify-between items-center mb-3 mt-3">
              <h4 className="font-medium">Monthly History</h4>
              <AddMonthDialog
                account={account}
                onAddMonth={(month, entry) =>
                  onAddMonth(account.id, month, entry)
                }
              />
            </div>

            <MonthlyHistoryTable
              history={history}
              editingValues={editingValues}
              accountId={account.id}
              onValueChange={onValueChange}
              onSave={onSave}
              onEdit={onEdit}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
