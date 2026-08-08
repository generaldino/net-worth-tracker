"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  ArchiveRestore,
  Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useMasking } from "@/contexts/masking-context";
import type { Account, AccountType, MonthlyEntry } from "@/lib/types";
import { accountTypes, supportedCurrencies, currencyLabels } from "@/lib/types";
import type { Currency } from "@/lib/fx-rates";
import { getCurrencySymbol } from "@/lib/fx-rates";
import {
  getAccountTypeLabel,
  getCategoryFromType,
  isLiabilityType,
} from "@/lib/account-helpers";
import {
  createAccount,
  updateAccount,
  deleteAccount,
  toggleAccountClosed,
  addMonthlyEntry,
  updateMonthlyEntry,
  deleteMonthlyEntry,
} from "@/lib/actions";

export interface AccountsAdminProps {
  accounts: Account[];
  accountHistories: Record<string, MonthlyEntry[]>;
  currentValues: Record<string, number | { balance: number } | null>;
  isDemo?: boolean;
}

// Assets first, debts last — mirrors how people think about their accounts.
const TYPE_ORDER: AccountType[] = [
  "Current",
  "Savings",
  "Investment",
  "Stock",
  "Crypto",
  "Pension",
  "Commodity",
  "Stock_options",
  "Asset",
  "Credit_Card",
  "Loan",
];

function formatMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function formatValue(value: number, currency: Currency, masked: boolean) {
  if (masked) return "••••••";
  return `${getCurrencySymbol(currency)}${Math.round(value).toLocaleString("en-GB")}`;
}

/**
 * The accounts admin page: add, rename, close, and correct history.
 * Month-to-month updates happen in the check-in, not here.
 */
export function AccountsAdmin({
  accounts: initialAccounts,
  accountHistories,
  currentValues: rawCurrentValues,
  isDemo = false,
}: AccountsAdminProps) {
  const router = useRouter();
  const { isMasked } = useMasking();

  const [search, setSearch] = React.useState("");
  const [showClosed, setShowClosed] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const [addAccountOpen, setAddAccountOpen] = React.useState(false);
  const [editAccount, setEditAccount] = React.useState<Account | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Account | null>(null);
  const [entryDialog, setEntryDialog] = React.useState<{
    account: Account;
    entry: MonthlyEntry | null; // null = add new month
  } | null>(null);
  const [deleteEntryTarget, setDeleteEntryTarget] = React.useState<{
    account: Account;
    entry: MonthlyEntry;
  } | null>(null);

  const currentValues = React.useMemo(() => {
    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(rawCurrentValues)) {
      if (value === null) normalized[key] = 0;
      else if (typeof value === "number") normalized[key] = value;
      else normalized[key] = value.balance;
    }
    return normalized;
  }, [rawCurrentValues]);

  const visibleAccounts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialAccounts
      .filter((a) => (showClosed ? true : !a.isClosed))
      .filter((a) => (q ? a.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (a.isClosed !== b.isClosed) return a.isClosed ? 1 : -1;
        const t =
          TYPE_ORDER.indexOf(a.type as AccountType) -
          TYPE_ORDER.indexOf(b.type as AccountType);
        if (t !== 0) return t;
        return a.name.localeCompare(b.name);
      });
  }, [initialAccounts, search, showClosed]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportToCSV = () => {
    const headers = ["Name", "Type", "Currency", "Status", "Current Value", "Last Updated"];
    const rows = visibleAccounts.map((a) => {
      const history = accountHistories[a.id] || [];
      const lastMonth = history[0]?.month ?? "";
      return [
        a.name,
        getAccountTypeLabel(a.type as AccountType),
        a.currency ?? "GBP",
        a.isClosed ? "Closed" : "Open",
        String(currentValues[a.id] ?? 0),
        lastMonth,
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `accounts-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Accounts</h1>
          <p className="text-xs text-muted-foreground">
            Add, rename or close accounts here — monthly values live in the
            check-in.
          </p>
        </div>
        {!isDemo && (
          <Button size="sm" className="gap-1.5" onClick={() => setAddAccountOpen(true)}>
            <Plus className="size-4" />
            Add account
          </Button>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts…"
            className="h-9 pl-8"
          />
        </div>
        <div className="flex h-9 items-center gap-2 rounded-md border px-2.5">
          <Label htmlFor="show-closed" className="cursor-pointer whitespace-nowrap text-xs">
            Show closed
          </Label>
          <Switch
            id="show-closed"
            checked={showClosed}
            onCheckedChange={setShowClosed}
            className="scale-75"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-muted-foreground"
          onClick={exportToCSV}
          disabled={visibleAccounts.length === 0}
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Export CSV</span>
        </Button>
      </div>

      {visibleAccounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium">
            {initialAccounts.length === 0
              ? "No accounts yet"
              : "No accounts match"}
          </p>
          {initialAccounts.length === 0 && !isDemo && (
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => setAddAccountOpen(true)}>
              <Plus className="size-4" />
              Add your first account
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {visibleAccounts.map((account) => {
            const history = accountHistories[account.id] || [];
            const isOpen = expanded.has(account.id);
            const value = currentValues[account.id] ?? 0;
            const liability = isLiabilityType(account.type as AccountType);
            const lastMonth = history[0]?.month ?? null;

            return (
              <div key={account.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 sm:px-4",
                    account.isClosed && "opacity-55",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(account.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={isOpen}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        !isOpen && "-rotate-90",
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {account.name}
                        {account.isClosed && (
                          <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                            closed
                          </Badge>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {getAccountTypeLabel(account.type as AccountType)}
                        {liability ? " · you owe" : ""} ·{" "}
                        {account.currency ?? "GBP"}
                        {lastMonth
                          ? ` · updated ${formatMonthLabel(lastMonth)}`
                          : " · no values yet"}
                      </span>
                    </span>
                  </button>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold tabular-nums",
                      liability && value > 0 && "text-red-600 dark:text-red-400",
                    )}
                  >
                    {liability && value > 0 ? "−" : ""}
                    {formatValue(value, (account.currency ?? "GBP") as Currency, isMasked)}
                  </span>
                  {!isDemo && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8 shrink-0">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Account actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditAccount(account)}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={async () => {
                            const result = await toggleAccountClosed(
                              account.id,
                              !account.isClosed,
                            );
                            if (result.success) router.refresh();
                            else
                              toast({
                                variant: "destructive",
                                title: "Could not update account",
                              });
                          }}
                        >
                          {account.isClosed ? (
                            <>
                              <ArchiveRestore className="mr-2 size-4" />
                              Reopen
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 size-4" />
                              Close
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(account)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                {isOpen && (
                  <div className="border-t bg-muted/30 px-3 py-3 sm:px-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        History
                      </h3>
                      {!isDemo && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => setEntryDialog({ account, entry: null })}
                        >
                          <Plus className="size-3.5" />
                          Add month
                        </Button>
                      )}
                    </div>
                    {history.length === 0 ? (
                      <p className="py-3 text-sm text-muted-foreground">
                        No monthly values yet — add one, or run a check-in.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground">
                            <th className="py-1 font-medium">Month</th>
                            <th className="py-1 text-right font-medium">Balance</th>
                            <th className="py-1 text-right font-medium">Change</th>
                            {!isDemo && <th className="w-16" />}
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((entry, i) => {
                            const prev = history[i + 1];
                            const change = prev
                              ? entry.endingBalance - prev.endingBalance
                              : null;
                            return (
                              <tr key={entry.month} className="border-t border-border/60">
                                <td className="py-1.5">{formatMonthLabel(entry.month)}</td>
                                <td className="py-1.5 text-right tabular-nums">
                                  {formatValue(
                                    entry.endingBalance,
                                    (account.currency ?? "GBP") as Currency,
                                    isMasked,
                                  )}
                                </td>
                                <td
                                  className={cn(
                                    "py-1.5 text-right text-xs tabular-nums",
                                    change === null
                                      ? "text-muted-foreground"
                                      : change >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-600 dark:text-red-400",
                                  )}
                                >
                                  {change === null
                                    ? "—"
                                    : `${change >= 0 ? "+" : "−"}${formatValue(
                                        Math.abs(change),
                                        (account.currency ?? "GBP") as Currency,
                                        isMasked,
                                      )}`}
                                </td>
                                {!isDemo && (
                                  <td className="py-1.5">
                                    <div className="flex justify-end gap-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7"
                                        title="Edit"
                                        onClick={() =>
                                          setEntryDialog({ account, entry })
                                        }
                                      >
                                        <Pencil className="size-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-7 text-destructive hover:text-destructive"
                                        title="Delete"
                                        onClick={() =>
                                          setDeleteEntryTarget({ account, entry })
                                        }
                                      >
                                        <Trash2 className="size-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <AccountDialog
        open={addAccountOpen || editAccount !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddAccountOpen(false);
            setEditAccount(null);
          }
        }}
        account={editAccount}
        onSaved={() => router.refresh()}
      />

      <EntryDialog
        state={entryDialog}
        onOpenChange={(open) => !open && setEntryDialog(null)}
        onSaved={() => router.refresh()}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The account and its entire monthly history will be removed. If
              you just stopped using it, close it instead — closed accounts
              keep their history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                const result = await deleteAccount(deleteTarget.id);
                setDeleteTarget(null);
                if (result.success) {
                  toast({ title: "Account deleted" });
                  router.refresh();
                } else {
                  toast({
                    variant: "destructive",
                    title: "Delete failed",
                    description: result.error,
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteEntryTarget !== null}
        onOpenChange={(open) => !open && setDeleteEntryTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete{" "}
              {deleteEntryTarget
                ? formatMonthLabel(deleteEntryTarget.entry.month)
                : ""}{" "}
              for {deleteEntryTarget?.account.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved balance for that month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteEntryTarget) return;
                const result = await deleteMonthlyEntry(
                  deleteEntryTarget.account.id,
                  deleteEntryTarget.entry.month,
                );
                setDeleteEntryTarget(null);
                if (result.success) router.refresh();
                else
                  toast({
                    variant: "destructive",
                    title: "Delete failed",
                    description: result.error,
                  });
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / edit account — a name, a friendly type, a currency. Nothing else.
// ---------------------------------------------------------------------------

function AccountDialog({
  open,
  onOpenChange,
  account,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("Current");
  const [currency, setCurrency] = React.useState<Currency>("GBP");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(account?.name ?? "");
      setType((account?.type as AccountType) ?? "Current");
      setCurrency((account?.currency as Currency) ?? "GBP");
    }
  }, [open, account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = account
        ? await updateAccount({
            id: account.id,
            name,
            type,
            category: getCategoryFromType(type),
            isISA: account.isISA,
            owner: account.owner,
            currency,
          })
        : await createAccount({
            name,
            type,
            category: getCategoryFromType(type),
            isISA: false,
            owner: "all",
            currency,
          });

      if (result.success) {
        toast({ title: account ? "Account updated" : "Account added" });
        onOpenChange(false);
        onSaved();
      } else {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: result.error,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Edit account" : "Add account"}</DialogTitle>
          <DialogDescription>
            {account
              ? "Rename it or fix its type and currency."
              : "Name it the way your bank does — you'll recognise it faster."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Barclays Current"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accountTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {getAccountTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {currencyLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : account ? (
                "Save"
              ) : (
                "Add account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Add / edit one month's balance for one account (corrections; the check-in
// is the everyday path).
// ---------------------------------------------------------------------------

function EntryDialog({
  state,
  onOpenChange,
  onSaved,
}: {
  state: { account: Account; entry: MonthlyEntry | null } | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [month, setMonth] = React.useState("");
  const [balance, setBalance] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (state) {
      setMonth(state.entry?.month ?? "");
      setBalance(
        state.entry !== null ? String(state.entry.endingBalance) : "",
      );
    }
  }, [state]);

  if (!state) return null;
  const { account, entry } = state;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const value = Number.parseFloat(balance) || 0;
      const result = entry
        ? await updateMonthlyEntry(account.id, entry.month, {
            endingBalance: value,
          })
        : await addMonthlyEntry(account.id, month, { endingBalance: value });

      if (result.success) {
        onOpenChange(false);
        onSaved();
      } else {
        toast({
          variant: "destructive",
          title: "Save failed",
          description: result.error,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {entry
              ? `Edit ${formatMonthLabel(entry.month)}`
              : "Add a month"}
          </DialogTitle>
          <DialogDescription>{account.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!entry && (
            <div className="space-y-2">
              <Label htmlFor="entry-month">Month</Label>
              <Input
                id="entry-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="entry-balance">
              Balance at month end ({getCurrencySymbol((account.currency ?? "GBP") as Currency)})
            </Label>
            <Input
              id="entry-balance"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              placeholder="0"
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
