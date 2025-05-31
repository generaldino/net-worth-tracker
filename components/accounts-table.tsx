"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Account,
  type MonthlyEntry,
  type ValueTimePeriod,
  valueTimePeriods,
} from "@/lib/types";
import { ChevronDown, ChevronRight, Edit, Trash2, Save } from "lucide-react";
import { AddMonthDialog } from "@/components/add-month-dialog";
import {
  deleteAccount,
  updateMonthlyEntry,
  getCurrentValue,
  getAccountHistory,
  calculateValueChange,
} from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditAccountDialog } from "@/components/edit-account-dialog";

interface AccountsTableProps {
  accounts: Account[];
  monthlyData: Record<string, MonthlyEntry[]>;
  onDeleteAccount: (accountId: string) => void;
  onUpdateMonthlyEntry: (
    accountId: string,
    month: string,
    entry: Partial<MonthlyEntry>
  ) => void;
  onAddNewMonth: (
    accountId: string,
    month: string,
    entry: MonthlyEntry
  ) => void;
}

export function AccountsTable({
  accounts,
  monthlyData,
  onDeleteAccount,
  onUpdateMonthlyEntry,
  onAddNewMonth,
}: AccountsTableProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [editingValues, setEditingValues] = useState<
    Record<string, Record<string, any>>
  >({});
  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<ValueTimePeriod>("3M");
  const [currentValues, setCurrentValues] = useState<Record<string, number>>(
    {}
  );
  const [accountHistories, setAccountHistories] = useState<
    Record<string, MonthlyEntry[]>
  >({});
  const [valueChanges, setValueChanges] = useState<
    Record<string, { absoluteChange: number; percentageChange: number }>
  >({});
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Fetch current values, histories, and value changes for all accounts
  useEffect(() => {
    async function fetchAccountData() {
      const values: Record<string, number> = {};
      const histories: Record<string, MonthlyEntry[]> = {};
      const changes: Record<
        string,
        { absoluteChange: number; percentageChange: number }
      > = {};

      for (const account of accounts) {
        const [value, history, change] = await Promise.all([
          getCurrentValue(account.id),
          getAccountHistory(account.id),
          calculateValueChange(account.id, selectedTimePeriod),
        ]);
        values[account.id] = value;
        histories[account.id] = history;
        changes[account.id] = change;
      }

      setCurrentValues(values);
      setAccountHistories(histories);
      setValueChanges(changes);
    }
    fetchAccountData();
  }, [accounts, selectedTimePeriod]);

  const toggleAccount = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleValueChange = (
    accountId: string,
    month: string,
    field: string,
    value: string
  ) => {
    setEditingValues((prev) => ({
      ...prev,
      [accountId]: {
        ...(prev[accountId] || {}),
        [month]: {
          ...(prev[accountId]?.[month] || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleSaveValue = async (accountId: string, month: string) => {
    const editedEntry = editingValues[accountId]?.[month];
    if (editedEntry) {
      const updatedEntry = {
        endingBalance: Number.parseFloat(editedEntry.endingBalance) || 0,
        cashIn: Number.parseFloat(editedEntry.cashIn) || 0,
        cashOut: Number.parseFloat(editedEntry.cashOut) || 0,
      };

      const result = await updateMonthlyEntry(accountId, month, updatedEntry);

      if (result.success) {
        // Update the local state through the callback
        onUpdateMonthlyEntry(accountId, month, {
          endingBalance: updatedEntry.endingBalance,
          cashIn: updatedEntry.cashIn,
          cashOut: updatedEntry.cashOut,
        });

        // Clear the editing state
        setEditingValues((prev) => {
          const newState = { ...prev };
          if (newState[accountId]) {
            delete newState[accountId][month];
          }
          return newState;
        });

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
    }
  };

  const handleAddMonth = (
    accountId: string,
    month: string,
    entry: MonthlyEntry
  ) => {
    onAddNewMonth(accountId, month, entry);
  };

  return (
    <div className="space-y-4">
      {/* Time Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b">
        <div className="text-sm text-muted-foreground">
          Showing value changes over the selected time period
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Time Period:</span>
          <Select
            value={selectedTimePeriod}
            onValueChange={(value: ValueTimePeriod) =>
              setSelectedTimePeriod(value)
            }
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {valueTimePeriods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => {
          const currentValue = currentValues[account.id] || 0;
          const valueChange = valueChanges[account.id] || {
            absoluteChange: 0,
            percentageChange: 0,
          };
          const isExpanded = expandedAccounts.has(account.id);
          const history = accountHistories[account.id] || [];

          return (
            <Collapsible
              key={account.id}
              open={isExpanded}
              onOpenChange={() => toggleAccount(account.id)}
            >
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
                            <div className="font-medium text-base">
                              {account.name}
                            </div>
                            <div className="flex gap-2 mt-1">
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                {account.type}
                              </span>
                              {account.isISA && (
                                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                                  ISA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAccount(account);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Account</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "
                                  {account.name}"? This will permanently delete
                                  the account and all its associated monthly
                                  entries. This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    const dialog = document.querySelector(
                                      '[data-slot="dialog-content"]'
                                    );
                                    if (dialog) {
                                      (dialog as HTMLElement).click();
                                    }
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={async () => {
                                    const result = await deleteAccount(
                                      account.id
                                    );
                                    if (result.success) {
                                      toast({
                                        title: "Success",
                                        description:
                                          "Account deleted successfully",
                                      });
                                      onDeleteAccount(account.id);
                                      const dialog = document.querySelector(
                                        '[data-slot="dialog-content"]'
                                      );
                                      if (dialog) {
                                        (dialog as HTMLElement).click();
                                      }
                                    } else {
                                      toast({
                                        variant: "destructive",
                                        title: "Error",
                                        description:
                                          result.error ||
                                          "Failed to delete account",
                                      });
                                    }
                                  }}
                                >
                                  Delete Account
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Current Value:
                          </span>
                          <div className="font-medium text-lg">
                            £{currentValue.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {
                              valueTimePeriods.find(
                                (p) => p.value === selectedTimePeriod
                              )?.label
                            }{" "}
                            Change:
                          </span>
                          <div
                            className={`font-medium ${
                              valueChange.absoluteChange >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {valueChange.absoluteChange >= 0 ? "+" : ""}£
                            {valueChange.absoluteChange.toLocaleString()}
                          </div>
                          <div
                            className={`text-xs ${
                              valueChange.percentageChange >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ({valueChange.percentageChange >= 0 ? "+" : ""}
                            {valueChange.percentageChange.toFixed(1)}%)
                          </div>
                        </div>
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
                        <div className="grid grid-cols-5 gap-4 flex-1 items-center">
                          <div className="font-medium">{account.name}</div>
                          <div className="flex gap-2">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              {account.type}
                            </span>
                            {account.isISA && (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10">
                                ISA
                              </span>
                            )}
                          </div>
                          <div className="font-medium">
                            £{currentValue.toLocaleString()}
                          </div>
                          <div
                            className={`font-medium ${
                              valueChange.absoluteChange >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {valueChange.absoluteChange >= 0 ? "+" : ""}£
                            {valueChange.absoluteChange.toLocaleString()}
                          </div>
                          <div
                            className={`font-medium ${
                              valueChange.percentageChange >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {valueChange.percentageChange >= 0 ? "+" : ""}
                            {valueChange.percentageChange.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAccount(account);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Account</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete "{account.name}
                                "? This will permanently delete the account and
                                all its associated monthly entries. This action
                                cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  const dialog = document.querySelector(
                                    '[data-slot="dialog-content"]'
                                  );
                                  if (dialog) {
                                    (dialog as HTMLElement).click();
                                  }
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={async () => {
                                  const result = await deleteAccount(
                                    account.id
                                  );
                                  if (result.success) {
                                    toast({
                                      title: "Success",
                                      description:
                                        "Account deleted successfully",
                                    });
                                    onDeleteAccount(account.id);
                                    const dialog = document.querySelector(
                                      '[data-slot="dialog-content"]'
                                    );
                                    if (dialog) {
                                      (dialog as HTMLElement).click();
                                    }
                                  } else {
                                    toast({
                                      variant: "destructive",
                                      title: "Error",
                                      description:
                                        result.error ||
                                        "Failed to delete account",
                                    });
                                  }
                                }}
                              >
                                Delete Account
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t">
                    <div className="flex justify-between items-center mb-3 mt-3">
                      <h4 className="font-medium">Monthly History</h4>
                      <AddMonthDialog
                        account={account}
                        monthlyData={monthlyData}
                        onAddMonth={(month, entry) =>
                          handleAddMonth(account.id, month, entry)
                        }
                      />
                    </div>

                    {history.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No monthly data yet.</p>
                        <p className="text-sm">
                          Use the "Add Month" button to get started.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Mobile History Layout */}
                        <div className="block sm:hidden space-y-3">
                          {history.map((entry) => {
                            const isEditing =
                              editingValues[account.id]?.[entry.monthKey] !==
                              undefined;

                            return (
                              <div
                                key={entry.monthKey}
                                className="bg-muted/30 rounded-lg p-3"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="font-medium">
                                    {entry.month}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (isEditing) {
                                        handleSaveValue(
                                          account.id,
                                          entry.monthKey
                                        );
                                      } else {
                                        setEditingValues((prev) => ({
                                          ...prev,
                                          [account.id]: {
                                            ...(prev[account.id] || {}),
                                            [entry.monthKey]: {
                                              endingBalance:
                                                entry.endingBalance.toString(),
                                              cashIn: entry.cashIn.toString(),
                                              cashOut: entry.cashOut.toString(),
                                            },
                                          },
                                        }));
                                      }
                                    }}
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
                                    <span className="text-muted-foreground">
                                      Balance:
                                    </span>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={
                                          editingValues[account.id][
                                            entry.monthKey
                                          ].endingBalance
                                        }
                                        onChange={(e) =>
                                          handleValueChange(
                                            account.id,
                                            entry.monthKey,
                                            "endingBalance",
                                            e.target.value
                                          )
                                        }
                                        className="mt-1"
                                      />
                                    ) : (
                                      <div className="font-medium">
                                        £{entry.endingBalance.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Growth:
                                    </span>
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
                                    <span className="text-muted-foreground">
                                      Cash In:
                                    </span>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={
                                          editingValues[account.id][
                                            entry.monthKey
                                          ].cashIn
                                        }
                                        onChange={(e) =>
                                          handleValueChange(
                                            account.id,
                                            entry.monthKey,
                                            "cashIn",
                                            e.target.value
                                          )
                                        }
                                        className="mt-1"
                                      />
                                    ) : (
                                      <div className="font-medium">
                                        £{entry.cashIn.toLocaleString()}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Cash Out:
                                    </span>
                                    {isEditing ? (
                                      <Input
                                        type="number"
                                        value={
                                          editingValues[account.id][
                                            entry.monthKey
                                          ].cashOut
                                        }
                                        onChange={(e) =>
                                          handleValueChange(
                                            account.id,
                                            entry.monthKey,
                                            "cashOut",
                                            e.target.value
                                          )
                                        }
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
                                <TableHead className="w-[100px]">
                                  Actions
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {history.map((entry) => {
                                const isEditing =
                                  editingValues[account.id]?.[
                                    entry.monthKey
                                  ] !== undefined;

                                return (
                                  <TableRow key={entry.monthKey}>
                                    <TableCell>{entry.month}</TableCell>
                                    <TableCell>
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          value={
                                            editingValues[account.id][
                                              entry.monthKey
                                            ].endingBalance
                                          }
                                          onChange={(e) =>
                                            handleValueChange(
                                              account.id,
                                              entry.monthKey,
                                              "endingBalance",
                                              e.target.value
                                            )
                                          }
                                          className="w-[120px]"
                                        />
                                      ) : (
                                        `£${entry.endingBalance.toLocaleString()}`
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          value={
                                            editingValues[account.id][
                                              entry.monthKey
                                            ].cashIn
                                          }
                                          onChange={(e) =>
                                            handleValueChange(
                                              account.id,
                                              entry.monthKey,
                                              "cashIn",
                                              e.target.value
                                            )
                                          }
                                          className="w-[100px]"
                                        />
                                      ) : (
                                        `£${entry.cashIn.toLocaleString()}`
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {isEditing ? (
                                        <Input
                                          type="number"
                                          value={
                                            editingValues[account.id][
                                              entry.monthKey
                                            ].cashOut
                                          }
                                          onChange={(e) =>
                                            handleValueChange(
                                              account.id,
                                              entry.monthKey,
                                              "cashOut",
                                              e.target.value
                                            )
                                          }
                                          className="w-[100px]"
                                        />
                                      ) : (
                                        `£${entry.cashOut.toLocaleString()}`
                                      )}
                                    </TableCell>
                                    <TableCell
                                      className={
                                        entry.cashFlow >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }
                                    >
                                      {entry.cashFlow >= 0 ? "+" : ""}£
                                      {entry.cashFlow.toLocaleString()}
                                    </TableCell>
                                    <TableCell
                                      className={
                                        entry.accountGrowth >= 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      }
                                    >
                                      {entry.accountGrowth >= 0 ? "+" : ""}£
                                      {entry.accountGrowth.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                      {isEditing ? (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            handleSaveValue(
                                              account.id,
                                              entry.monthKey
                                            )
                                          }
                                        >
                                          <Save className="h-4 w-4 mr-1" />
                                          Save
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingValues((prev) => ({
                                              ...prev,
                                              [account.id]: {
                                                ...(prev[account.id] || {}),
                                                [entry.monthKey]: {
                                                  endingBalance:
                                                    entry.endingBalance.toString(),
                                                  cashIn:
                                                    entry.cashIn.toString(),
                                                  cashOut:
                                                    entry.cashOut.toString(),
                                                },
                                              },
                                            }));
                                          }}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Header row for desktop reference */}
        <div className="hidden sm:grid grid-cols-5 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
          <div>Account Name</div>
          <div>Type</div>
          <div>Current Value</div>
          <div>
            {
              valueTimePeriods.find((p) => p.value === selectedTimePeriod)
                ?.label
            }{" "}
            Change
          </div>
          <div>% Change</div>
        </div>
      </div>

      <EditAccountDialog
        account={editingAccount}
        open={editingAccount !== null}
        onOpenChange={(open) => {
          if (!open) setEditingAccount(null);
        }}
      />
    </div>
  );
}
