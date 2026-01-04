"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
  Info,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Download,
  Filter,
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

// Types
type AccountType =
  | "Current"
  | "Savings"
  | "Investment"
  | "Stock"
  | "Crypto"
  | "Pension"
  | "Commodity"
  | "Stock_options"
  | "Credit_Card"
  | "Loan"
  | "Asset";
type AccountCategory = "Cash" | "Investments";
type Currency = "GBP" | "EUR" | "USD" | "AED";
type TimePeriod = "1M" | "3M" | "6M" | "1Y" | "YTD" | "ALL";

interface MonthlyEntry {
  id: string;
  month: string;
  endingBalance: number;
  cashIn: number;
  cashOut: number;
  income?: number;
  internalTransfersOut?: number;
  debtPayments?: number;
  expenditure?: number;
}

interface Account {
  id: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  currency: Currency;
  isISA: boolean;
  owner: string;
  isClosed: boolean;
  currentValue: number;
  valueChange: number;
  valueChangePercent: number;
  monthlyEntries?: MonthlyEntry[];
}

// Mock data
const mockAccounts: Account[] = [
  {
    id: "1",
    name: "Vanguard S&P 500",
    type: "Investment",
    category: "Investments",
    currency: "GBP",
    isISA: true,
    owner: "John",
    isClosed: false,
    currentValue: 125430,
    valueChange: 8234,
    valueChangePercent: 7.02,
    monthlyEntries: [
      {
        id: "1",
        month: "2024-12",
        endingBalance: 125430,
        cashIn: 1000,
        cashOut: 0,
      },
      {
        id: "2",
        month: "2024-11",
        endingBalance: 117196,
        cashIn: 1000,
        cashOut: 0,
      },
      {
        id: "3",
        month: "2024-10",
        endingBalance: 113245,
        cashIn: 1000,
        cashOut: 0,
      },
    ],
  },
  {
    id: "2",
    name: "Santander Current",
    type: "Current",
    category: "Cash",
    currency: "GBP",
    isISA: false,
    owner: "Sarah",
    isClosed: false,
    currentValue: 4250,
    valueChange: -342,
    valueChangePercent: -7.45,
    monthlyEntries: [
      {
        id: "1",
        month: "2024-12",
        endingBalance: 4250,
        cashIn: 4500,
        cashOut: 4100,
        income: 4500,
        internalTransfersOut: 1000,
        debtPayments: 0,
        expenditure: 3100,
      },
      {
        id: "2",
        month: "2024-11",
        endingBalance: 3850,
        cashIn: 4500,
        cashOut: 3900,
        income: 4500,
        internalTransfersOut: 1000,
        debtPayments: 0,
        expenditure: 2900,
      },
    ],
  },
  {
    id: "3",
    name: "Coinbase Crypto",
    type: "Crypto",
    category: "Investments",
    currency: "USD",
    isISA: false,
    owner: "John",
    isClosed: false,
    currentValue: 18750,
    valueChange: 2340,
    valueChangePercent: 14.28,
    monthlyEntries: [],
  },
  {
    id: "4",
    name: "Premium Bonds",
    type: "Savings",
    category: "Cash",
    currency: "GBP",
    isISA: false,
    owner: "Sarah",
    isClosed: false,
    currentValue: 50000,
    valueChange: 0,
    valueChangePercent: 0,
    monthlyEntries: [],
  },
];

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
  Asset:
    "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30",
};

const currencySymbols: Record<
  Currency,
  { symbol: string; position: "before" | "after" }
> = {
  GBP: { symbol: "£", position: "before" },
  EUR: { symbol: "€", position: "before" },
  USD: { symbol: "$", position: "before" },
  AED: { symbol: "د.إ", position: "after" },
};

export function AccountsTable() {
  const [accounts, setAccounts] = React.useState<Account[]>(mockAccounts);
  const [expandedAccounts, setExpandedAccounts] = React.useState<Set<string>>(
    new Set()
  );
  const [isMasked, setIsMasked] = React.useState(false);
  const [selectedPeriod, setSelectedPeriod] = React.useState<TimePeriod>("3M");
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

  const formatCurrency = (
    value: number,
    currency: Currency,
    masked = false
  ) => {
    if (masked) return "••••••";

    const { symbol, position } = currencySymbols[currency];
    const formatted = Math.floor(value).toLocaleString();

    return position === "before"
      ? `${symbol}${formatted}`
      : `${formatted} ${symbol}`;
  };

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
    const rows = filteredAccounts.map((acc) => [
      acc.name,
      acc.type.replace("_", " "),
      acc.category,
      acc.currency,
      acc.isISA ? "Yes" : "No",
      acc.owner,
      acc.isClosed ? "Closed" : "Open",
      acc.currentValue.toString(),
      acc.valueChange.toString(),
      acc.valueChangePercent.toFixed(2),
    ]);

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
            onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}
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

          {/* Privacy Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsMasked(!isMasked)}
            className="h-8 w-8"
          >
            {isMasked ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>

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
                <AccountRow
                  key={account.id}
                  account={account}
                  isExpanded={expandedAccounts.has(account.id)}
                  onToggleExpand={() => toggleExpanded(account.id)}
                  isMasked={isMasked}
                  formatCurrency={formatCurrency}
                  onEdit={(acc) => {
                    setSelectedAccount(acc);
                    setShowEditAccountDialog(true);
                  }}
                  onDelete={(acc) => {
                    setSelectedAccount(acc);
                    setShowDeleteDialog(true);
                  }}
                  onToggleClosed={(acc) => {
                    setAccounts(
                      accounts.map((a) =>
                        a.id === acc.id ? { ...a, isClosed: !a.isClosed } : a
                      )
                    );
                  }}
                  onAddEntry={(acc) => {
                    setSelectedAccount(acc);
                    setShowAddEntryDialog(true);
                  }}
                  onEditEntry={(accountId, entry) => {
                    setSelectedEntry({ accountId, entry });
                    setShowEditEntryDialog(true);
                  }}
                  onDeleteEntry={(accountId, entry) => {
                    setSelectedEntry({ accountId, entry });
                    setShowDeleteEntryDialog(true);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y">
          {filteredAccounts.map((account) => (
            <AccountCardMobile
              key={account.id}
              account={account}
              isExpanded={expandedAccounts.has(account.id)}
              onToggleExpand={() => toggleExpanded(account.id)}
              isMasked={isMasked}
              formatCurrency={formatCurrency}
              onEdit={(acc) => {
                setSelectedAccount(acc);
                setShowEditAccountDialog(true);
              }}
              onDelete={(acc) => {
                setSelectedAccount(acc);
                setShowDeleteDialog(true);
              }}
              onToggleClosed={(acc) => {
                setAccounts(
                  accounts.map((a) =>
                    a.id === acc.id ? { ...a, isClosed: !a.isClosed } : a
                  )
                );
              }}
              onAddEntry={(acc) => {
                setSelectedAccount(acc);
                setShowAddEntryDialog(true);
              }}
              onEditEntry={(accountId, entry) => {
                setSelectedEntry({ accountId, entry });
                setShowEditEntryDialog(true);
              }}
              onDeleteEntry={(accountId, entry) => {
                setSelectedEntry({ accountId, entry });
                setShowDeleteEntryDialog(true);
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

      <AddAccountDialog
        open={showAddAccountDialog}
        onOpenChange={setShowAddAccountDialog}
        onSave={(newAccount) => {
          setAccounts([
            ...accounts,
            { ...newAccount, id: Date.now().toString() },
          ]);
          setShowAddAccountDialog(false);
        }}
      />

      <EditAccountDialog
        open={showEditAccountDialog}
        onOpenChange={setShowEditAccountDialog}
        account={selectedAccount}
        onSave={(updatedAccount) => {
          setAccounts(
            accounts.map((a) =>
              a.id === updatedAccount.id ? updatedAccount : a
            )
          );
          setShowEditAccountDialog(false);
        }}
      />

      <DeleteAccountDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        accountName={selectedAccount?.name || ""}
        onConfirm={() => {
          setAccounts(accounts.filter((a) => a.id !== selectedAccount?.id));
          setShowDeleteDialog(false);
        }}
      />

      <AddEntryDialog
        open={showAddEntryDialog}
        onOpenChange={setShowAddEntryDialog}
        account={selectedAccount}
        onSave={(newEntry) => {
          setAccounts(
            accounts.map((a) => {
              if (a.id === selectedAccount?.id) {
                return {
                  ...a,
                  monthlyEntries: [
                    ...(a.monthlyEntries || []),
                    { ...newEntry, id: Date.now().toString() },
                  ],
                };
              }
              return a;
            })
          );
          setShowAddEntryDialog(false);
        }}
      />

      <EditEntryDialog
        open={showEditEntryDialog}
        onOpenChange={setShowEditEntryDialog}
        entry={selectedEntry}
        accountType={
          accounts.find((a) => a.id === selectedEntry?.accountId)?.type
        }
        onSave={(updatedEntry) => {
          setAccounts(
            accounts.map((a) => {
              if (a.id === selectedEntry?.accountId) {
                return {
                  ...a,
                  monthlyEntries: a.monthlyEntries?.map((e) =>
                    e.id === updatedEntry.id ? updatedEntry : e
                  ),
                };
              }
              return a;
            })
          );
          setShowEditEntryDialog(false);
        }}
      />

      <DeleteEntryDialog
        open={showDeleteEntryDialog}
        onOpenChange={setShowDeleteEntryDialog}
        entryMonth={selectedEntry?.entry.month || ""}
        onConfirm={() => {
          setAccounts(
            accounts.map((a) => {
              if (a.id === selectedEntry?.accountId) {
                return {
                  ...a,
                  monthlyEntries: a.monthlyEntries?.filter(
                    (e) => e.id !== selectedEntry?.entry.id
                  ),
                };
              }
              return a;
            })
          );
          setShowDeleteEntryDialog(false);
        }}
      />
    </div>
  );
}

interface AccountRowProps {
  account: Account;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMasked: boolean;
  formatCurrency: (
    value: number,
    currency: Currency,
    masked?: boolean
  ) => string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onToggleClosed: (account: Account) => void;
  onAddEntry: (account: Account) => void;
  onEditEntry: (accountId: string, entry: MonthlyEntry) => void;
  onDeleteEntry: (accountId: string, entry: MonthlyEntry) => void;
}

function AccountRow({
  account,
  isExpanded,
  onToggleExpand,
  isMasked,
  formatCurrency,
  onEdit,
  onDelete,
  onToggleClosed,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
}: AccountRowProps) {
  const isPositiveChange = account.valueChange >= 0;

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
        {/* Drag Handle */}
        <td className="p-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 cursor-grab"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </td>

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
            {formatCurrency(account.currentValue, account.currency, isMasked)}
          </p>
          {account.currency !== "GBP" && !isMasked && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {formatCurrency(account.currentValue * 0.85, "GBP")}
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
            {!isMasked && (isPositiveChange ? "+" : "")}
            {formatCurrency(
              Math.abs(account.valueChange),
              account.currency,
              isMasked
            )}
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
            {Math.abs(account.valueChangePercent).toFixed(2)}%
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
              <DropdownMenuItem
                className="text-sm"
                onClick={() => onEdit(account)}
              >
                <Edit2 className="h-3.5 w-3.5 mr-2" />
                Edit Account
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-sm"
                onClick={() => onToggleClosed(account)}
              >
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
                onClick={() => onDelete(account)}
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
          <td colSpan={7} className="p-0">
            <div className="bg-muted/30 p-3 border-t">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Monthly History</h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs bg-transparent"
                  onClick={() => onAddEntry(account)}
                >
                  <Plus className="h-3 w-3" />
                  Add Month
                </Button>
              </div>

              {account.monthlyEntries && account.monthlyEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <MonthlyHistoryTable
                    entries={account.monthlyEntries}
                    accountType={account.type}
                    currency={account.currency}
                    isMasked={isMasked}
                    formatCurrency={formatCurrency}
                    onEdit={(entry) => onEditEntry(account.id, entry)}
                    onDelete={(entry) => onDeleteEntry(account.id, entry)}
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

interface MonthlyHistoryTableProps {
  entries: MonthlyEntry[];
  accountType: AccountType;
  currency: Currency;
  isMasked: boolean;
  formatCurrency: (
    value: number,
    currency: Currency,
    masked?: boolean
  ) => string;
  onEdit: (entry: MonthlyEntry) => void;
  onDelete: (entry: MonthlyEntry) => void;
}

function MonthlyHistoryTable({
  entries,
  accountType,
  currency,
  isMasked,
  formatCurrency,
  onEdit,
  onDelete,
}: MonthlyHistoryTableProps) {
  const isCurrentAccount = accountType === "Current";

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
                    label="Internal Transfers Out"
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
          {entries.map((entry, index) => {
            const previousBalance =
              index < entries.length - 1 ? entries[index + 1].endingBalance : 0;
            const cashFlow = entry.cashIn - entry.cashOut;
            const accountGrowth =
              entry.endingBalance - previousBalance - cashFlow;

            return (
              <tr
                key={entry.id}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="p-2 font-medium">{entry.month}</td>
                <td className="p-2 text-right tabular-nums">
                  {formatCurrency(entry.endingBalance, currency, isMasked)}
                </td>
                {isCurrentAccount && (
                  <>
                    <td className="p-2 text-right tabular-nums">
                      {formatCurrency(entry.income || 0, currency, isMasked)}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {formatCurrency(
                        entry.internalTransfersOut || 0,
                        currency,
                        isMasked
                      )}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {formatCurrency(
                        entry.debtPayments || 0,
                        currency,
                        isMasked
                      )}
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {formatCurrency(
                        entry.expenditure || 0,
                        currency,
                        isMasked
                      )}
                    </td>
                  </>
                )}
                <td className="p-2 text-right tabular-nums text-green-600 dark:text-green-400">
                  {formatCurrency(entry.cashIn, currency, isMasked)}
                </td>
                <td className="p-2 text-right tabular-nums text-red-600 dark:text-red-400">
                  {formatCurrency(entry.cashOut, currency, isMasked)}
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
                  {formatCurrency(Math.abs(cashFlow), currency, isMasked)}
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
                  {formatCurrency(Math.abs(accountGrowth), currency, isMasked)}
                </td>
                <td className="p-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onEdit(entry)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => onDelete(entry)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddAccountDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (account: Omit<Account, "id">) => void;
}) {
  const [formData, setFormData] = React.useState({
    name: "",
    type: "Current" as AccountType,
    category: "Cash" as AccountCategory,
    currency: "GBP" as Currency,
    isISA: false,
    owner: "",
    currentValue: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      isClosed: false,
      valueChange: 0,
      valueChangePercent: 0,
      monthlyEntries: [],
    });
    setFormData({
      name: "",
      type: "Current",
      category: "Cash",
      currency: "GBP",
      isISA: false,
      owner: "",
      currentValue: 0,
    });
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
                  <SelectItem value="Asset">Asset</SelectItem>
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

          <div className="space-y-2">
            <Label htmlFor="currentValue">Current Value</Label>
            <Input
              id="currentValue"
              type="number"
              step="0.01"
              value={formData.currentValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentValue: Number.parseFloat(e.target.value) || 0,
                })
              }
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isISA"
              checked={formData.isISA}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isISA: checked as boolean })
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

function EditAccountDialog({
  open,
  onOpenChange,
  account,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onSave: (account: Account) => void;
}) {
  const [formData, setFormData] = React.useState({
    name: "",
    type: "Current" as AccountType,
    category: "Cash" as AccountCategory,
    currency: "GBP" as Currency,
    isISA: false,
    owner: "",
    currentValue: 0,
  });

  React.useEffect(() => {
    if (account) {
      setFormData({
        name: account.name,
        type: account.type,
        category: account.category,
        currency: account.currency,
        isISA: account.isISA,
        owner: account.owner,
        currentValue: account.currentValue,
      });
    }
  }, [account]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (account) {
      onSave({
        ...account,
        ...formData,
      });
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the details of your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Account Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Account Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as AccountType })
                }
              >
                <SelectTrigger id="edit-type">
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
                  <SelectItem value="Asset">Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    category: value as AccountCategory,
                  })
                }
              >
                <SelectTrigger id="edit-category">
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
              <Label htmlFor="edit-currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value as Currency })
                }
              >
                <SelectTrigger id="edit-currency">
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
              <Label htmlFor="edit-owner">Owner</Label>
              <Input
                id="edit-owner"
                value={formData.owner}
                onChange={(e) =>
                  setFormData({ ...formData, owner: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-currentValue">Current Value</Label>
            <Input
              id="edit-currentValue"
              type="number"
              step="0.01"
              value={formData.currentValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  currentValue: Number.parseFloat(e.target.value) || 0,
                })
              }
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="edit-isISA"
              checked={formData.isISA}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isISA: checked as boolean })
              }
            />
            <Label
              htmlFor="edit-isISA"
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
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
            action cannot be undone and will permanently remove the account and
            all its monthly history data.
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
  onSave: (entry: Omit<MonthlyEntry, "id">) => void;
}) {
  const isCurrentAccount = account?.type === "Current";

  const [formData, setFormData] = React.useState({
    month: "",
    endingBalance: 0,
    cashIn: 0,
    cashOut: 0,
    income: 0,
    internalTransfersOut: 0,
    debtPayments: 0,
    expenditure: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      month: "",
      endingBalance: 0,
      cashIn: 0,
      cashOut: 0,
      income: 0,
      internalTransfersOut: 0,
      debtPayments: 0,
      expenditure: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Monthly Entry</DialogTitle>
          <DialogDescription>
            Add a new monthly entry for {account?.name}
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
                  endingBalance: Number.parseFloat(e.target.value) || 0,
                })
              }
              required
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
                    cashIn: Number.parseFloat(e.target.value) || 0,
                  })
                }
                required
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
                    cashOut: Number.parseFloat(e.target.value) || 0,
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
                  <Label htmlFor="income">Income</Label>
                  <Input
                    id="income"
                    type="number"
                    step="0.01"
                    value={formData.income}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        income: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internalTransfersOut">
                    Internal Transfers Out
                  </Label>
                  <Input
                    id="internalTransfersOut"
                    type="number"
                    step="0.01"
                    value={formData.internalTransfersOut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalTransfersOut:
                          Number.parseFloat(e.target.value) || 0,
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
                        debtPayments: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expenditure">Expenditure</Label>
                  <Input
                    id="expenditure"
                    type="number"
                    step="0.01"
                    value={formData.expenditure}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expenditure: Number.parseFloat(e.target.value) || 0,
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
    endingBalance: 0,
    cashIn: 0,
    cashOut: 0,
    income: 0,
    internalTransfersOut: 0,
    debtPayments: 0,
    expenditure: 0,
  });

  React.useEffect(() => {
    if (entry) {
      setFormData({
        month: entry.entry.month,
        endingBalance: entry.entry.endingBalance,
        cashIn: entry.entry.cashIn,
        cashOut: entry.entry.cashOut,
        income: entry.entry.income || 0,
        internalTransfersOut: entry.entry.internalTransfersOut || 0,
        debtPayments: entry.entry.debtPayments || 0,
        expenditure: entry.entry.expenditure || 0,
      });
    }
  }, [entry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entry) {
      onSave({
        ...entry.entry,
        ...formData,
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
                  endingBalance: Number.parseFloat(e.target.value) || 0,
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
                    cashIn: Number.parseFloat(e.target.value) || 0,
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
                    cashOut: Number.parseFloat(e.target.value) || 0,
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
                        income: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-internalTransfersOut">
                    Internal Transfers Out
                  </Label>
                  <Input
                    id="edit-internalTransfersOut"
                    type="number"
                    step="0.01"
                    value={formData.internalTransfersOut}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        internalTransfersOut:
                          Number.parseFloat(e.target.value) || 0,
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
                        debtPayments: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-expenditure">Expenditure</Label>
                  <Input
                    id="edit-expenditure"
                    type="number"
                    step="0.01"
                    value={formData.expenditure}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expenditure: Number.parseFloat(e.target.value) || 0,
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

// Mobile-responsive account card component
interface AccountCardMobileProps {
  account: Account;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isMasked: boolean;
  formatCurrency: (
    value: number,
    currency: Currency,
    masked?: boolean
  ) => string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onToggleClosed: (account: Account) => void;
  onAddEntry: (account: Account) => void;
  onEditEntry: (accountId: string, entry: MonthlyEntry) => void;
  onDeleteEntry: (accountId: string, entry: MonthlyEntry) => void;
}

function AccountCardMobile({
  account,
  isExpanded,
  onToggleExpand,
  isMasked,
  formatCurrency,
  onEdit,
  onDelete,
  onToggleClosed,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
}: AccountCardMobileProps) {
  const isPositiveChange = account.valueChange >= 0;

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
            <DropdownMenuItem
              className="text-sm"
              onClick={() => onEdit(account)}
            >
              <Edit2 className="h-3.5 w-3.5 mr-2" />
              Edit Account
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-sm"
              onClick={() => onToggleClosed(account)}
            >
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
              onClick={() => onDelete(account)}
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
            {formatCurrency(account.currentValue, account.currency, isMasked)}
          </p>
          {account.currency !== "GBP" && !isMasked && (
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {formatCurrency(account.currentValue * 0.85, "GBP")}
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
            {!isMasked && (isPositiveChange ? "+" : "")}
            {formatCurrency(
              Math.abs(account.valueChange),
              account.currency,
              isMasked
            )}
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
            {Math.abs(account.valueChangePercent).toFixed(2)}%
          </p>
        </div>
      </div>

      {account.monthlyEntries && account.monthlyEntries.length > 0 && (
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
          {isExpanded ? "Hide" : "Show"} Monthly History (
          {account.monthlyEntries.length})
        </Button>
      )}

      {isExpanded &&
        account.monthlyEntries &&
        account.monthlyEntries.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-xs">Monthly History</h4>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-6 text-[10px] bg-transparent"
                onClick={() => onAddEntry(account)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {account.monthlyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2 rounded-md border bg-muted/30 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{entry.month}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-xs"
                          onClick={() => onEditEntry(account.id, entry)}
                        >
                          <Edit2 className="h-3 w-3 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive text-xs"
                          onClick={() => onDeleteEntry(account.id, entry)}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div>
                      <span className="text-muted-foreground">Balance:</span>
                      <span className="ml-1 font-medium tabular-nums">
                        {formatCurrency(
                          entry.endingBalance,
                          account.currency,
                          isMasked
                        )}
                      </span>
                    </div>
                    {entry.cashIn !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Cash In:</span>
                        <span className="ml-1 font-medium tabular-nums">
                          {formatCurrency(
                            entry.cashIn,
                            account.currency,
                            isMasked
                          )}
                        </span>
                      </div>
                    )}
                    {entry.cashOut !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Cash Out:</span>
                        <span className="ml-1 font-medium tabular-nums">
                          {formatCurrency(
                            entry.cashOut,
                            account.currency,
                            isMasked
                          )}
                        </span>
                      </div>
                    )}
                    {entry.income !== undefined && (
                      <div>
                        <span className="text-muted-foreground">Income:</span>
                        <span className="ml-1 font-medium tabular-nums">
                          {formatCurrency(
                            entry.income,
                            account.currency,
                            isMasked
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
