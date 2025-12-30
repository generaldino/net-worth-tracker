"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Plus,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Download,
  Filter,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type Account,
  type MonthlyEntry,
  type AccountType,
  type AccountCategory,
  type ValueTimePeriod,
} from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";
import type { DisplayCurrency } from "@/components/currency-selector";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import {
  deleteAccount,
  toggleAccountClosed,
  addMonthlyEntry,
  updateMonthlyEntry,
  deleteMonthlyEntry,
} from "@/lib/actions";
import { toast } from "@/components/ui/use-toast";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import { shouldShowIncomeExpenditure } from "@/lib/account-helpers";
import { createAccount } from "@/lib/actions";

export interface NewAccountsSectionProps {
  accounts: Account[];
  accountHistories: Record<string, MonthlyEntry[]>;
  currentValues: Record<string, number>;
}

// Calculate value change based on time period
function calculateValueChange(
  history: MonthlyEntry[],
  timePeriod: ValueTimePeriod
): { absoluteChange: number; percentageChange: number } {
  if (history.length === 0) {
    return { absoluteChange: 0, percentageChange: 0 };
  }

  const currentValue = Number(history[0].endingBalance);
  let previousValue: number;

  switch (timePeriod) {
    case "1M":
      previousValue = history[1] ? Number(history[1].endingBalance) : 0;
      break;
    case "3M":
      previousValue = history[3] ? Number(history[3].endingBalance) : 0;
      break;
    case "6M":
      previousValue = history[6] ? Number(history[6].endingBalance) : 0;
      break;
    case "1Y":
      previousValue = history[12] ? Number(history[12].endingBalance) : 0;
      break;
    case "YTD":
      const currentYear = new Date().getFullYear();
      const ytdEntry = history.find((entry) =>
        entry.month.startsWith(`${currentYear}-01`)
      );
      previousValue = ytdEntry ? Number(ytdEntry.endingBalance) : 0;
      break;
    case "ALL":
    default:
      previousValue = history[history.length - 1]
        ? Number(history[history.length - 1].endingBalance)
        : 0;
  }

  const absoluteChange = currentValue - previousValue;
  const percentageChange =
    previousValue === 0 ? 0 : (absoluteChange / previousValue) * 100;

  return { absoluteChange, percentageChange };
}

const accountTypeColors: Record<AccountType, string> = {
  Current:
    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
  Savings:
    "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30",
  Investment:
    "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30",
  Stock:
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
  Crypto:
    "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30",
  Pension:
    "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-500/30",
  Commodity:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30",
  Stock_options:
    "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-500/30",
  Credit_Card:
    "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30",
  Loan: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30",
};

export function NewAccountsSection({
  accounts: initialAccounts,
  accountHistories,
  currentValues,
}: NewAccountsSectionProps) {
  const router = useRouter();
  const { isMasked } = useMasking();
  const { displayCurrency } = useDisplayCurrency();
  const [accounts, setAccounts] = React.useState<Account[]>(initialAccounts);
  const [expandedAccounts, setExpandedAccounts] = React.useState<Set<string>>(
    new Set()
  );
  const [selectedPeriod, setSelectedPeriod] =
    React.useState<ValueTimePeriod>("3M");
  const [showClosed, setShowClosed] = React.useState(false);

  const [filterAccountTypes, setFilterAccountTypes] = React.useState<
    Set<AccountType>
  >(new Set());
  const [filterCategories, setFilterCategories] = React.useState<
    Set<AccountCategory>
  >(new Set());
  const [filterCurrencies, setFilterCurrencies] = React.useState<Set<Currency>>(
    new Set()
  );
  const [filterOwners, setFilterOwners] = React.useState<Set<string>>(
    new Set()
  );

  const [showAddAccountDialog, setShowAddAccountDialog] = React.useState(false);
  const [showEditAccountDialog, setShowEditAccountDialog] =
    React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showAddEntryDialog, setShowAddEntryDialog] = React.useState(false);
  const [showEditEntryDialog, setShowEditEntryDialog] = React.useState(false);
  const [showDeleteEntryDialog, setShowDeleteEntryDialog] =
    React.useState(false);
  const [selectedAccount, setSelectedAccount] = React.useState<Account | null>(
    null
  );
  const [selectedEntry, setSelectedEntry] = React.useState<{
    accountId: string;
    entry: MonthlyEntry;
  } | null>(null);

  // Update accounts when initialAccounts changes (e.g., after router.refresh())
  React.useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  const toggleExpanded = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (!showClosed && acc.isClosed) return false;
    if (filterAccountTypes.size > 0 && !filterAccountTypes.has(acc.type))
      return false;
    if (filterCategories.size > 0 && !filterCategories.has(acc.category))
      return false;
    if (filterCurrencies.size > 0 && !filterCurrencies.has(acc.currency))
      return false;
    if (filterOwners.size > 0 && !filterOwners.has(acc.owner)) return false;
    return true;
  });

  const uniqueAccountTypes = Array.from(new Set(accounts.map((a) => a.type)));
  const uniqueCategories = Array.from(new Set(accounts.map((a) => a.category)));
  const uniqueCurrencies = Array.from(new Set(accounts.map((a) => a.currency)));
  const uniqueOwners = Array.from(new Set(accounts.map((a) => a.owner)));

  const exportToCSV = () => {
    const headers = [
      "Account Name",
      "Type",
      "Category",
      "Currency",
      "ISA",
      "Owner",
      "Status",
      "Current Value",
      "Value Change",
      "Value Change %",
    ];
    const rows = filteredAccounts.map((acc) => {
      const history = accountHistories[acc.id] || [];
      const valueChange = calculateValueChange(history, selectedPeriod);
      return [
        acc.name,
        acc.type.replace("_", " "),
        acc.category,
        acc.currency,
        acc.isISA ? "Yes" : "No",
        acc.owner,
        acc.isClosed ? "Closed" : "Open",
        currentValues[acc.id]?.toString() || "0",
        valueChange.absoluteChange.toString(),
        valueChange.percentageChange.toFixed(2),
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `accounts-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFilterItem = <T,>(
    set: Set<T>,
    item: T,
    setter: (set: Set<T>) => void
  ) => {
    const newSet = new Set(set);
    if (newSet.has(item)) {
      newSet.delete(item);
    } else {
      newSet.add(item);
    }
    setter(newSet);
  };

  const activeFilterCount =
    filterAccountTypes.size +
    filterCategories.size +
    filterCurrencies.size +
    filterOwners.size;

  // Calculate value changes for all accounts
  const calculatedValueChanges = React.useMemo(() => {
    return Object.fromEntries(
      accounts.map((account) => [
        account.id,
        calculateValueChange(
          accountHistories[account.id] || [],
          selectedPeriod
        ),
      ])
    );
  }, [accounts, accountHistories, selectedPeriod]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Accounts</h2>
            <p className="text-xs text-muted-foreground">
              {filteredAccounts.length} of {accounts.length} accounts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Period Selector */}
          <Select
            value={selectedPeriod}
            onValueChange={(value) =>
              setSelectedPeriod(value as ValueTimePeriod)
            }
          >
            <SelectTrigger className="h-8 w-[90px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1M">1M</SelectItem>
              <SelectItem value="3M">3M</SelectItem>
              <SelectItem value="6M">6M</SelectItem>
              <SelectItem value="1Y">1Y</SelectItem>
              <SelectItem value="YTD">YTD</SelectItem>
              <SelectItem value="ALL">ALL</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 relative bg-transparent"
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge
                    variant="default"
                    className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3" align="start">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Account Type</h4>
                  <div className="space-y-1.5">
                    {uniqueAccountTypes.map((type) => (
                      <label
                        key={type}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={filterAccountTypes.has(type)}
                          onChange={() =>
                            toggleFilterItem(
                              filterAccountTypes,
                              type,
                              setFilterAccountTypes
                            )
                          }
                          className="rounded border-gray-300"
                        />
                        <span>{type.replace("_", " ")}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Category</h4>
                  <div className="space-y-1.5">
                    {uniqueCategories.map((category) => (
                      <label
                        key={category}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={filterCategories.has(category)}
                          onChange={() =>
                            toggleFilterItem(
                              filterCategories,
                              category,
                              setFilterCategories
                            )
                          }
                          className="rounded border-gray-300"
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Currency</h4>
                  <div className="space-y-1.5">
                    {uniqueCurrencies.map((currency) => (
                      <label
                        key={currency}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={filterCurrencies.has(currency)}
                          onChange={() =>
                            toggleFilterItem(
                              filterCurrencies,
                              currency,
                              setFilterCurrencies
                            )
                          }
                          className="rounded border-gray-300"
                        />
                        <span>{currency}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Owner</h4>
                  <div className="space-y-1.5">
                    {uniqueOwners.map((owner) => (
                      <label
                        key={owner}
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={filterOwners.has(owner)}
                          onChange={() =>
                            toggleFilterItem(
                              filterOwners,
                              owner,
                              setFilterOwners
                            )
                          }
                          className="rounded border-gray-300"
                        />
                        <span>{owner}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => {
                      setFilterAccountTypes(new Set());
                      setFilterCategories(new Set());
                      setFilterCurrencies(new Set());
                      setFilterOwners(new Set());
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 px-2 py-1 rounded-md border h-8">
            <Label
              htmlFor="show-closed"
              className="text-xs cursor-pointer whitespace-nowrap"
            >
              Show Closed
            </Label>
            <Switch
              id="show-closed"
              checked={showClosed}
              onCheckedChange={setShowClosed}
              className="scale-75"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="h-8 gap-1.5 bg-transparent"
            disabled={filteredAccounts.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          {/* Add Account Button */}
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs ml-auto"
            onClick={() => setShowAddAccountDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Account</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        {/* Desktop table view - hidden on mobile */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-2"></th>
                <th className="text-left p-2 font-medium text-sm">Account</th>
                <th className="text-left p-2 font-medium text-sm">Type</th>
                <th className="text-right p-2 font-medium text-sm">
                  Current Value
                </th>
                <th className="text-right p-2 font-medium text-sm">Change</th>
                <th className="w-10 p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account) => (
                <AccountRowDesktop
                  key={account.id}
                  account={account}
                  currentValue={currentValues[account.id] || 0}
                  valueChange={
                    calculatedValueChanges[account.id] || {
                      absoluteChange: 0,
                      percentageChange: 0,
                    }
                  }
                  history={accountHistories[account.id] || []}
                  isExpanded={expandedAccounts.has(account.id)}
                  onToggleExpand={() => toggleExpanded(account.id)}
                  isMasked={isMasked}
                  displayCurrency={displayCurrency}
                  onEdit={() => {
                    setSelectedAccount(account);
                    setShowEditAccountDialog(true);
                  }}
                  onDelete={() => {
                    setSelectedAccount(account);
                    setShowDeleteDialog(true);
                  }}
                  onToggleClosed={async () => {
                    const result = await toggleAccountClosed(
                      account.id,
                      !account.isClosed
                    );
                    if (result.success) {
                      router.refresh();
                      toast({
                        title: account.isClosed
                          ? "Account reopened"
                          : "Account closed",
                        description: `The account has been ${
                          account.isClosed ? "reopened" : "closed"
                        }.`,
                      });
                    } else {
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: result.error || "Failed to update account",
                      });
                    }
                  }}
                  onAddEntry={() => {
                    setSelectedAccount(account);
                    setShowAddEntryDialog(true);
                  }}
                  onEditEntry={(entry) => {
                    setSelectedEntry({ accountId: account.id, entry });
                    setShowEditEntryDialog(true);
                  }}
                  onDeleteEntry={(entry) => {
                    setSelectedEntry({ accountId: account.id, entry });
                    setShowDeleteEntryDialog(true);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile view */}
        <div className="md:hidden divide-y">
          {filteredAccounts.map((account) => (
            <AccountCardMobile
              key={account.id}
              account={account}
              currentValue={currentValues[account.id] || 0}
              valueChange={
                calculatedValueChanges[account.id] || {
                  absoluteChange: 0,
                  percentageChange: 0,
                }
              }
              history={accountHistories[account.id] || []}
              isExpanded={expandedAccounts.has(account.id)}
              onToggleExpand={() => toggleExpanded(account.id)}
              isMasked={isMasked}
              displayCurrency={displayCurrency}
              onEdit={() => {
                setSelectedAccount(account);
                setShowEditAccountDialog(true);
              }}
              onDelete={() => {
                setSelectedAccount(account);
                setShowDeleteDialog(true);
              }}
              onToggleClosed={async () => {
                const result = await toggleAccountClosed(
                  account.id,
                  !account.isClosed
                );
                if (result.success) {
                  router.refresh();
                  toast({
                    title: account.isClosed
                      ? "Account reopened"
                      : "Account closed",
                  });
                } else {
                  toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.error || "Failed to update account",
                  });
                }
              }}
              onAddEntry={() => {
                setSelectedAccount(account);
                setShowAddEntryDialog(true);
              }}
              onEditEntry={(entry) => {
                setSelectedEntry({ accountId: account.id, entry });
                setShowEditEntryDialog(true);
              }}
            />
          ))}
        </div>
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-8 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">No accounts found</p>
          {activeFilterCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={() => {
                setFilterAccountTypes(new Set());
                setFilterCategories(new Set());
                setFilterCurrencies(new Set());
                setFilterOwners(new Set());
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Use existing EditAccountDialog component */}
      <EditAccountDialog
        account={selectedAccount}
        open={showEditAccountDialog}
        onOpenChange={setShowEditAccountDialog}
      />

      {/* Add Account Dialog */}
      <AddAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onSave={async (newAccount) => {
          const result = await createAccount({
            name: newAccount.name,
            type: newAccount.type,
            category: newAccount.category,
            currency: newAccount.currency,
            isISA: newAccount.isISA,
            owner: newAccount.owner,
          });
          if (result.success) {
            router.refresh();
            toast({
              title: "Success",
              description: "Account created successfully",
            });
            setShowAddAccountDialog(false);
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "Failed to create account",
            });
          }
        }}
      />

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        accountName={selectedAccount?.name || ""}
        onConfirm={async () => {
          if (!selectedAccount) return;
          const result = await deleteAccount(selectedAccount.id);
          if (result.success) {
            router.refresh();
            toast({
              title: "Success",
              description: "Account deleted successfully",
            });
            setShowDeleteDialog(false);
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "Failed to delete account",
            });
          }
        }}
      />

      <AddEntryDialog
        open={showAddEntryDialog}
        onOpenChange={setShowAddEntryDialog}
        account={selectedAccount}
        onSave={async (newEntry) => {
          if (!selectedAccount) return;
          const result = await addMonthlyEntry(
            selectedAccount.id,
            newEntry.month,
            {
              endingBalance: newEntry.endingBalance,
              cashIn: newEntry.cashIn,
              cashOut: newEntry.cashOut,
              income: newEntry.income || 0,
              internalTransfersOut: newEntry.internalTransfersOut || 0,
              debtPayments: newEntry.debtPayments || 0,
            }
          );
          if (result.success) {
            router.refresh();
            toast({
              title: "Success",
              description: "Monthly entry added successfully",
            });
            setShowAddEntryDialog(false);
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "Failed to add monthly entry",
            });
          }
        }}
      />

      <EditEntryDialog
        open={showEditEntryDialog}
        onOpenChange={setShowEditEntryDialog}
        entry={selectedEntry}
        accountType={
          accounts.find((a) => a.id === selectedEntry?.accountId)?.type
        }
        onSave={async (updatedEntry) => {
          if (!selectedEntry) return;
          const result = await updateMonthlyEntry(
            selectedEntry.accountId,
            updatedEntry.month,
            {
              endingBalance: updatedEntry.endingBalance,
              cashIn: updatedEntry.cashIn,
              cashOut: updatedEntry.cashOut,
              income: updatedEntry.income || 0,
              internalTransfersOut: updatedEntry.internalTransfersOut || 0,
              debtPayments: updatedEntry.debtPayments || 0,
            }
          );
          if (result.success) {
            router.refresh();
            toast({
              title: "Success",
              description: "Monthly entry updated successfully",
            });
            setShowEditEntryDialog(false);
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "Failed to update monthly entry",
            });
          }
        }}
      />

      <DeleteEntryDialog
        open={showDeleteEntryDialog}
        onOpenChange={setShowDeleteEntryDialog}
        entryMonth={selectedEntry?.entry.month || ""}
        onConfirm={async () => {
          if (!selectedEntry) return;
          const result = await deleteMonthlyEntry(
            selectedEntry.accountId,
            selectedEntry.entry.month
          );
          if (result.success) {
            router.refresh();
            toast({
              title: "Success",
              description: "Monthly entry deleted successfully",
            });
            setShowDeleteEntryDialog(false);
          } else {
            toast({
              variant: "destructive",
              title: "Error",
              description: result.error || "Failed to delete monthly entry",
            });
          }
        }}
      />
    </div>
  );
}

interface StyledMonthlyHistoryTableProps {
  history: MonthlyEntry[];
  accountType: AccountType;
  accountCurrency: Currency;
  displayCurrency: Currency;
  isMasked: boolean;
  onEditEntry: (entry: MonthlyEntry) => void;
  onDeleteEntry: (entry: MonthlyEntry) => void;
}

function StyledMonthlyHistoryTable({
  history,
  accountType,
  accountCurrency,
  displayCurrency,
  isMasked,
  onEditEntry,
  onDeleteEntry,
}: StyledMonthlyHistoryTableProps) {
  const isCurrentAccount = shouldShowIncomeExpenditure(accountType);

  const FieldHeader = ({
    label,
    tooltip,
  }: {
    label: string;
    tooltip?: string;
  }) => (
    <div className="flex items-center gap-1 whitespace-nowrap">
      <span>{label}</span>
      {tooltip && (
        <span title={tooltip}>
          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
        </span>
      )}
    </div>
  );

  // Sort history by month (oldest first for calculating growth)
  const sortedHistory = [...history].sort(
    (a: MonthlyEntry, b: MonthlyEntry) =>
      new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr className="border-b">
            <th className="text-left p-2 font-medium">
              <FieldHeader label="Month" />
            </th>
            <th className="text-right p-2 font-medium">
              <FieldHeader
                label="Ending Balance"
                tooltip="The account balance at the end of this month"
              />
            </th>
            {isCurrentAccount && (
              <>
                <th className="text-right p-2 font-medium">
                  <FieldHeader
                    label="Income"
                    tooltip="Total income received this month (salary, bonuses, etc.)"
                  />
                </th>
                <th className="text-right p-2 font-medium">
                  <FieldHeader
                    label="Internal Transfers"
                    tooltip="Money transferred to other accounts you own"
                  />
                </th>
                <th className="text-right p-2 font-medium">
                  <FieldHeader
                    label="Debt Payments"
                    tooltip="Payments made towards loans or credit cards"
                  />
                </th>
                <th className="text-right p-2 font-medium">
                  <FieldHeader
                    label="Expenditure"
                    tooltip="Actual spending (Cash Out - Internal Transfers - Debt Payments)"
                  />
                </th>
              </>
            )}
            <th className="text-right p-2 font-medium">
              <FieldHeader
                label="Cash In"
                tooltip="Total money added to this account"
              />
            </th>
            <th className="text-right p-2 font-medium">
              <FieldHeader
                label="Cash Out"
                tooltip="Total money removed from this account"
              />
            </th>
            <th className="text-right p-2 font-medium">
              <FieldHeader
                label="Cash Flow"
                tooltip="Net cash movement (Cash In - Cash Out)"
              />
            </th>
            <th className="text-right p-2 font-medium">
              <FieldHeader
                label="Growth"
                tooltip="Account growth from market movements or interest"
              />
            </th>
            <th className="text-right p-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-card">
          {sortedHistory.map((entry, index) => {
            const previousBalance =
              index > 0 ? sortedHistory[index - 1].endingBalance : 0;
            const cashFlow = entry.cashFlow ?? entry.cashIn - entry.cashOut;
            const accountGrowth =
              entry.accountGrowth ??
              (index > 0
                ? entry.endingBalance - previousBalance - cashFlow
                : 0);

            return (
              <StyledMonthlyHistoryRow
                key={entry.month}
                entry={entry}
                accountCurrency={accountCurrency}
                displayCurrency={displayCurrency}
                isMasked={isMasked}
                isCurrentAccount={isCurrentAccount}
                cashFlow={cashFlow}
                accountGrowth={accountGrowth}
                onEditEntry={onEditEntry}
                onDeleteEntry={onDeleteEntry}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface StyledMonthlyHistoryRowProps {
  entry: MonthlyEntry;
  accountCurrency: Currency;
  displayCurrency: Currency;
  isMasked: boolean;
  isCurrentAccount: boolean;
  cashFlow: number;
  accountGrowth: number;
  onEditEntry: (entry: MonthlyEntry) => void;
  onDeleteEntry: (entry: MonthlyEntry) => void;
}

function StyledMonthlyHistoryRow({
  entry,
  accountCurrency,
  displayCurrency,
  isMasked,
  isCurrentAccount,
  cashFlow,
  accountGrowth,
  onEditEntry,
  onDeleteEntry,
}: StyledMonthlyHistoryRowProps) {
  const { convertedAmount: convertedEndingBalance } = useCurrencyConversion(
    entry.endingBalance,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedIncome } = useCurrencyConversion(
    entry.income || 0,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedInternalTransfersOut } =
    useCurrencyConversion(
      entry.internalTransfersOut || 0,
      accountCurrency,
      displayCurrency,
      entry.month
    );
  const { convertedAmount: convertedDebtPayments } = useCurrencyConversion(
    entry.debtPayments || 0,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedExpenditure } = useCurrencyConversion(
    entry.expenditure || 0,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedCashIn } = useCurrencyConversion(
    entry.cashIn,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedCashOut } = useCurrencyConversion(
    entry.cashOut,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedCashFlow } = useCurrencyConversion(
    cashFlow,
    accountCurrency,
    displayCurrency,
    entry.month
  );
  const { convertedAmount: convertedAccountGrowth } = useCurrencyConversion(
    accountGrowth,
    accountCurrency,
    displayCurrency,
    entry.month
  );

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="p-2 font-medium">{entry.month}</td>
      <td className="p-2 text-right tabular-nums">
        {isMasked
          ? "••••••"
          : formatCurrencyAmount(convertedEndingBalance, displayCurrency)}
      </td>
      {isCurrentAccount && (
        <>
          <td className="p-2 text-right tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(convertedIncome, displayCurrency)}
          </td>
          <td className="p-2 text-right tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(
                  convertedInternalTransfersOut,
                  displayCurrency
                )}
          </td>
          <td className="p-2 text-right tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(convertedDebtPayments, displayCurrency)}
          </td>
          <td className="p-2 text-right tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(convertedExpenditure, displayCurrency)}
          </td>
        </>
      )}
      <td className="p-2 text-right tabular-nums text-green-600 dark:text-green-400">
        {isMasked
          ? "••••••"
          : formatCurrencyAmount(convertedCashIn, displayCurrency)}
      </td>
      <td className="p-2 text-right tabular-nums text-red-600 dark:text-red-400">
        {isMasked
          ? "••••••"
          : formatCurrencyAmount(convertedCashOut, displayCurrency)}
      </td>
      <td
        className={cn(
          "p-2 text-right tabular-nums font-medium",
          cashFlow >= 0
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        )}
      >
        {!isMasked && (cashFlow >= 0 ? "+" : "")}
        {isMasked
          ? "••••••"
          : formatCurrencyAmount(Math.abs(convertedCashFlow), displayCurrency)}
      </td>
      <td
        className={cn(
          "p-2 text-right tabular-nums font-medium",
          accountGrowth >= 0
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        )}
      >
        {!isMasked && (accountGrowth >= 0 ? "+" : "")}
        {isMasked
          ? "••••••"
          : formatCurrencyAmount(
              Math.abs(convertedAccountGrowth),
              displayCurrency
            )}
      </td>
      <td className="p-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onEditEntry(entry)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDeleteEntry(entry)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// Missing component implementations - simplified versions
interface AccountRowDesktopProps {
  account: Account;
  currentValue: number;
  valueChange: { absoluteChange: number; percentageChange: number };
  history: MonthlyEntry[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMasked: boolean;
  displayCurrency: DisplayCurrency;
  onEdit: () => void;
  onDelete: () => void;
  onToggleClosed: () => void;
  onAddEntry: () => void;
  onEditEntry: (entry: MonthlyEntry) => void;
  onDeleteEntry: (entry: MonthlyEntry) => void;
}

function AccountRowDesktop({
  account,
  currentValue,
  valueChange,
  history,
  isExpanded,
  onToggleExpand,
  isMasked,
  displayCurrency,
  onEdit,
  onDelete,
  onToggleClosed,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
}: AccountRowDesktopProps) {
  const accountCurrency = (account.currency || "GBP") as Currency;
  const effectiveDisplayCurrency =
    displayCurrency === "BASE"
      ? accountCurrency
      : (displayCurrency as Currency);
  const needsConversion = effectiveDisplayCurrency !== accountCurrency;

  const { convertedAmount: convertedCurrentValue } = useCurrencyConversion(
    currentValue,
    accountCurrency,
    effectiveDisplayCurrency
  );

  const { convertedAmount: convertedAbsoluteChange } = useCurrencyConversion(
    valueChange.absoluteChange,
    accountCurrency,
    effectiveDisplayCurrency
  );

  const isPositiveChange = valueChange.absoluteChange >= 0;

  return (
    <>
      <tr
        className={cn(
          "border-b hover:bg-muted/30 cursor-pointer transition-colors",
          account.isClosed && "opacity-60",
          isExpanded && "bg-muted/20"
        )}
        onClick={onToggleExpand}
      >
        {/* Expand Toggle */}
        <td className="p-2">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        </td>

        {/* Account Name & Owner */}
        <td className="p-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{account.name}</span>
            {account.isISA && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                ISA
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{account.owner}</p>
        </td>

        {/* Type Badge */}
        <td className="p-2">
          <Badge
            variant="outline"
            className={cn(
              "font-normal text-xs",
              accountTypeColors[account.type]
            )}
          >
            {account.type.replace("_", " ")}
          </Badge>
        </td>

        {/* Current Value */}
        <td className="p-2 text-right">
          <p className="font-semibold text-sm tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(
                  convertedCurrentValue,
                  effectiveDisplayCurrency
                )}
          </p>
          {needsConversion && !isMasked && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {formatCurrencyAmount(currentValue, accountCurrency)}
            </p>
          )}
        </td>

        {/* Value Change */}
        <td className="p-2 text-right">
          <p
            className={cn(
              "font-medium text-sm tabular-nums",
              isPositiveChange
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {isMasked
              ? "••••••"
              : `${isPositiveChange ? "+" : ""}${formatCurrencyAmount(
                  Math.abs(convertedAbsoluteChange),
                  effectiveDisplayCurrency
                )}`}
          </p>
          <p
            className={cn(
              "text-xs tabular-nums",
              isPositiveChange
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {isPositiveChange ? "+" : "-"}
            {Math.abs(valueChange.percentageChange).toFixed(2)}%
          </p>
        </td>

        {/* Actions */}
        <td className="p-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-sm" onClick={onEdit}>
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Edit Account
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm" onClick={onToggleClosed}>
                {account.isClosed ? (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5 mr-2" />
                    Reopen Account
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5 mr-2" />
                    Close Account
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive text-sm"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete Account
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>

      {/* Expanded Monthly History */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <div className="bg-muted/30 p-3 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Monthly History</h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddEntry();
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add Month
                </Button>
              </div>

              {history && history.length > 0 ? (
                <div className="overflow-x-auto">
                  <StyledMonthlyHistoryTable
                    history={history}
                    accountType={account.type}
                    accountCurrency={accountCurrency}
                    displayCurrency={effectiveDisplayCurrency}
                    isMasked={isMasked}
                    onEditEntry={onEditEntry}
                    onDeleteEntry={onDeleteEntry}
                  />
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-xs border rounded-lg bg-background/50">
                  No monthly data yet. Click &apos;Add Month&apos; to get
                  started.
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

interface MobileHistoryEntryProps {
  entry: MonthlyEntry;
  accountCurrency: Currency;
  effectiveDisplayCurrency: Currency;
  isMasked: boolean;
  onEdit: () => void;
}

function MobileHistoryEntry({
  entry,
  accountCurrency,
  effectiveDisplayCurrency,
  isMasked,
  onEdit,
}: MobileHistoryEntryProps) {
  const { convertedAmount: convertedBalance } = useCurrencyConversion(
    entry.endingBalance,
    accountCurrency,
    effectiveDisplayCurrency,
    entry.month
  );
  const { convertedAmount: convertedCashIn } = useCurrencyConversion(
    entry.cashIn,
    accountCurrency,
    effectiveDisplayCurrency,
    entry.month
  );

  return (
    <div className="p-2 rounded-md border bg-muted/30 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">{entry.month}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={onEdit}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div>
          <span className="text-muted-foreground">Balance:</span>
          <span className="ml-1 font-medium tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(
                  convertedBalance,
                  effectiveDisplayCurrency
                )}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Cash In:</span>
          <span className="ml-1 font-medium tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(convertedCashIn, effectiveDisplayCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface AccountCardMobileProps {
  account: Account;
  currentValue: number;
  valueChange: { absoluteChange: number; percentageChange: number };
  history: MonthlyEntry[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMasked: boolean;
  displayCurrency: DisplayCurrency;
  onEdit: () => void;
  onDelete: () => void;
  onToggleClosed: () => void;
  onAddEntry: () => void;
  onEditEntry: (entry: MonthlyEntry) => void;
}

function AccountCardMobile({
  account,
  currentValue,
  valueChange,
  history,
  isExpanded,
  onToggleExpand,
  isMasked,
  displayCurrency,
  onEdit,
  onDelete,
  onToggleClosed,
  onAddEntry,
  onEditEntry,
}: AccountCardMobileProps) {
  const accountCurrency = (account.currency || "GBP") as Currency;
  const effectiveDisplayCurrency =
    displayCurrency === "BASE"
      ? accountCurrency
      : (displayCurrency as Currency);
  const needsConversion = effectiveDisplayCurrency !== accountCurrency;

  const { convertedAmount: convertedCurrentValue } = useCurrencyConversion(
    currentValue,
    accountCurrency,
    effectiveDisplayCurrency
  );

  const { convertedAmount: convertedAbsoluteChange } = useCurrencyConversion(
    valueChange.absoluteChange,
    accountCurrency,
    effectiveDisplayCurrency
  );

  const isPositiveChange = valueChange.absoluteChange >= 0;

  return (
    <div className={cn("p-3 bg-background", account.isClosed && "opacity-60")}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{account.name}</h3>
            {account.isISA && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1 shrink-0"
              >
                ISA
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-muted-foreground">{account.owner}</p>
            <Badge
              variant="outline"
              className={cn(
                "font-normal text-[10px]",
                accountTypeColors[account.type]
              )}
            >
              {account.type.replace("_", " ")}
            </Badge>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-sm" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              Edit Account
            </DropdownMenuItem>
            <DropdownMenuItem className="text-sm" onClick={onToggleClosed}>
              {account.isClosed ? (
                <>
                  <ArchiveRestore className="h-3.5 w-3.5 mr-2" />
                  Reopen Account
                </>
              ) : (
                <>
                  <Archive className="h-3.5 w-3.5 mr-2" />
                  Close Account
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive text-sm"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete Account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Current Value</p>
          <p className="font-semibold text-base tabular-nums">
            {isMasked
              ? "••••••"
              : formatCurrencyAmount(
                  convertedCurrentValue,
                  effectiveDisplayCurrency
                )}
          </p>
          {needsConversion && !isMasked && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {formatCurrencyAmount(currentValue, accountCurrency)}
            </p>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-0.5">Change</p>
          <p
            className={cn(
              "font-medium text-sm tabular-nums",
              isPositiveChange
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {isMasked
              ? "••••••"
              : `${isPositiveChange ? "+" : ""}${formatCurrencyAmount(
                  Math.abs(convertedAbsoluteChange),
                  effectiveDisplayCurrency
                )}`}
          </p>
          <p
            className={cn(
              "text-xs tabular-nums",
              isPositiveChange
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {isPositiveChange ? "+" : "-"}
            {Math.abs(valueChange.percentageChange).toFixed(2)}%
          </p>
        </div>
      </div>

      {history && history.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 gap-1.5 text-xs"
          onClick={onToggleExpand}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {isExpanded ? "Hide" : "Show"} Monthly History ({history.length})
        </Button>
      )}

      {isExpanded && history && history.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-xs">Monthly History</h4>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-6 text-[10px] bg-transparent"
              onClick={onAddEntry}
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {history.slice(0, 5).map((entry) => (
              <MobileHistoryEntry
                key={entry.month}
                entry={entry}
                accountCurrency={accountCurrency}
                effectiveDisplayCurrency={effectiveDisplayCurrency}
                isMasked={isMasked}
                onEdit={() => onEditEntry(entry)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteEntryDialog({
  open,
  onOpenChange,
  entryMonth,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryMonth: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Monthly Entry?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the entry for{" "}
            <strong>{entryMonth}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete Entry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddAccountDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: {
    name: string;
    type: AccountType;
    category: AccountCategory;
    currency: Currency;
    isISA: boolean;
    owner: string;
  }) => void;
}) {
  const [formData, setFormData] = React.useState({
    name: "",
    type: "Current" as AccountType,
    category: "Cash" as AccountCategory,
    currency: "GBP" as Currency,
    isISA: false,
    owner: "",
  });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setFormData({
        name: "",
        type: "Current",
        category: "Cash",
        currency: "GBP",
        isISA: false,
        owner: "",
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Create a new account to track your finances.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Vanguard S&P 500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as AccountType })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Current">Current</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Stock">Stock</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="Pension">Pension</SelectItem>
                  <SelectItem value="Commodity">Commodity</SelectItem>
                  <SelectItem value="Stock_options">Stock Options</SelectItem>
                  <SelectItem value="Credit_Card">Credit Card</SelectItem>
                  <SelectItem value="Loan">Loan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category: value as AccountCategory,
                  })
                }
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Investments">Investments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value as Currency })
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="AED">AED (د.إ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Input
                id="owner"
                value={formData.owner}
                onChange={(e) =>
                  setFormData({ ...formData, owner: e.target.value })
                }
                placeholder="e.g., John"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isISA"
              checked={formData.isISA}
              onCheckedChange={(checked: boolean) =>
                setFormData({ ...formData, isISA: checked })
              }
            />
            <Label
              htmlFor="isISA"
              className="text-sm font-normal cursor-pointer"
            >
              This is an ISA account
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Account</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Dialog placeholders - use existing components
function DeleteAccountDialog({
  open,
  onOpenChange,
  accountName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Account?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{accountName}</strong>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddEntryDialog({
  open,
  onOpenChange,
  account,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onSave: (entry: {
    month: string;
    endingBalance: number;
    cashIn: number;
    cashOut: number;
    income?: number;
    internalTransfersOut?: number;
    debtPayments?: number;
  }) => void;
}) {
  const isCurrentAccount = account?.type === "Current";

  const [formData, setFormData] = React.useState({
    month: "",
    endingBalance: "",
    cashIn: "",
    cashOut: "",
    income: "",
    internalTransfersOut: "",
    debtPayments: "",
  });

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        month: "",
        endingBalance: "",
        cashIn: "",
        cashOut: "",
        income: "",
        internalTransfersOut: "",
        debtPayments: "",
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      month: formData.month,
      endingBalance: Number.parseFloat(formData.endingBalance) || 0,
      cashIn: Number.parseFloat(formData.cashIn) || 0,
      cashOut: Number.parseFloat(formData.cashOut) || 0,
      income: Number.parseFloat(formData.income) || 0,
      internalTransfersOut:
        Number.parseFloat(formData.internalTransfersOut) || 0,
      debtPayments: Number.parseFloat(formData.debtPayments) || 0,
    });
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Monthly Entry</DialogTitle>
          <DialogDescription>
            Add a new monthly entry for {account.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month (YYYY-MM)</Label>
            <Input
              id="month"
              type="month"
              value={formData.month}
              onChange={(e) =>
                setFormData({ ...formData, month: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endingBalance">Ending Balance</Label>
            <Input
              id="endingBalance"
              type="number"
              step="0.01"
              value={formData.endingBalance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endingBalance: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cashIn">Cash In</Label>
              <Input
                id="cashIn"
                type="number"
                step="0.01"
                value={formData.cashIn}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cashIn: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cashOut">Cash Out</Label>
              <Input
                id="cashOut"
                type="number"
                step="0.01"
                value={formData.cashOut}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cashOut: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {isCurrentAccount && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="income">Income</Label>
                  <Input
                    id="income"
                    type="number"
                    step="0.01"
                    value={formData.income}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        income: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internalTransfersOut">
                    Internal Transfers
                  </Label>
                  <Input
                    id="internalTransfersOut"
                    type="number"
                    step="0.01"
                    value={formData.internalTransfersOut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalTransfersOut: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="debtPayments">Debt Payments</Label>
                  <Input
                    id="debtPayments"
                    type="number"
                    step="0.01"
                    value={formData.debtPayments}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        debtPayments: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({
  open,
  onOpenChange,
  entry,
  accountType,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: { accountId: string; entry: MonthlyEntry } | null;
  accountType?: AccountType;
  onSave: (entry: MonthlyEntry) => void;
}) {
  const isCurrentAccount = accountType === "Current";

  const [formData, setFormData] = React.useState({
    month: "",
    endingBalance: "",
    cashIn: "",
    cashOut: "",
    income: "",
    internalTransfersOut: "",
    debtPayments: "",
  });

  React.useEffect(() => {
    if (entry) {
      setFormData({
        month: entry.entry.month,
        endingBalance: entry.entry.endingBalance.toString(),
        cashIn: entry.entry.cashIn.toString(),
        cashOut: entry.entry.cashOut.toString(),
        income: (entry.entry.income || 0).toString(),
        internalTransfersOut: (
          entry.entry.internalTransfersOut || 0
        ).toString(),
        debtPayments: (entry.entry.debtPayments || 0).toString(),
      });
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entry) {
      onSave({
        ...entry.entry,
        month: formData.month,
        endingBalance: Number.parseFloat(formData.endingBalance) || 0,
        cashIn: Number.parseFloat(formData.cashIn) || 0,
        cashOut: Number.parseFloat(formData.cashOut) || 0,
        income: Number.parseFloat(formData.income) || 0,
        internalTransfersOut:
          Number.parseFloat(formData.internalTransfersOut) || 0,
        debtPayments: Number.parseFloat(formData.debtPayments) || 0,
      });
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Monthly Entry</DialogTitle>
          <DialogDescription>
            Update the monthly entry for {formData.month}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-month">Month (YYYY-MM)</Label>
            <Input
              id="edit-month"
              type="month"
              value={formData.month}
              onChange={(e) =>
                setFormData({ ...formData, month: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-endingBalance">Ending Balance</Label>
            <Input
              id="edit-endingBalance"
              type="number"
              step="0.01"
              value={formData.endingBalance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endingBalance: e.target.value,
                })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cashIn">Cash In</Label>
              <Input
                id="edit-cashIn"
                type="number"
                step="0.01"
                value={formData.cashIn}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cashIn: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cashOut">Cash Out</Label>
              <Input
                id="edit-cashOut"
                type="number"
                step="0.01"
                value={formData.cashOut}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    cashOut: e.target.value,
                  })
                }
                required
              />
            </div>
          </div>

          {isCurrentAccount && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-income">Income</Label>
                  <Input
                    id="edit-income"
                    type="number"
                    step="0.01"
                    value={formData.income}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        income: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-internalTransfersOut">
                    Internal Transfers
                  </Label>
                  <Input
                    id="edit-internalTransfersOut"
                    type="number"
                    step="0.01"
                    value={formData.internalTransfersOut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalTransfersOut: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-debtPayments">Debt Payments</Label>
                  <Input
                    id="edit-debtPayments"
                    type="number"
                    step="0.01"
                    value={formData.debtPayments}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        debtPayments: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
