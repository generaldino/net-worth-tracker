"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Plus, Pencil, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "@/components/ui/use-toast";
import { FxRateDialog } from "./fx-rate-dialog";
import {
  deleteExchangeRate,
  refreshExchangeRate,
  type FxRateRow,
} from "@/app/actions/fx-rates";

interface FxRatesViewProps {
  rows: FxRateRow[];
}

export function FxRatesView({ rows }: FxRatesViewProps) {
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<FxRateRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<FxRateRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const existingMonths = rows.map((r) => r.month);

  const openAdd = () => {
    setEditRow(null);
    setDialogOpen(true);
  };

  const openEdit = (row: FxRateRow) => {
    setEditRow(row);
    setDialogOpen(true);
  };

  const handleRefresh = async (row: FxRateRow) => {
    setPendingId(row.id);
    try {
      const result = await refreshExchangeRate(row.month);
      if (result.success) {
        toast({
          title: "Rates refreshed",
          description: `Re-fetched rates for ${formatMonthLabel(row.month)} from the provider.`,
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Refresh failed",
          description: result.error ?? "Could not refresh the rate.",
        });
      }
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    const row = deleteRow;
    setPendingId(row.id);
    try {
      const result = await deleteExchangeRate(row.id);
      if (result.success) {
        toast({
          title: "Rate deleted",
          description: `Removed rates for ${formatMonthLabel(row.month)}.`,
        });
        router.refresh();
      } else {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: result.error ?? "Could not delete the rate.",
        });
      }
    } finally {
      setPendingId(null);
      setDeleteRow(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl sm:text-2xl font-semibold">FX Rates</h1>
          </div>
          <Button onClick={openAdd} size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add rate</span>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Monthly exchange rates used to convert account balances into your
          display currency. Rates are stored relative to GBP (1 GBP = X). Rates
          are normally fetched automatically at month-end — use this page to fix
          or fill in a month when the auto-update didn&apos;t work.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Coins className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No FX rates stored yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a rate for a month to get started.
          </p>
          <Button onClick={openAdd} size="sm" className="mt-4">
            <Plus className="size-4" />
            Add rate
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">GBP</TableHead>
                <TableHead className="text-right">EUR</TableHead>
                <TableHead className="text-right">USD</TableHead>
                <TableHead className="text-right">AED</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const busy = pendingId === row.id;
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatMonthLabel(row.month)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatRate(row.gbpRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(row.eurRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(row.usdRate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(row.aedRate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Re-fetch from provider"
                          disabled={busy}
                          onClick={() => handleRefresh(row)}
                        >
                          {busy ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <RefreshCw className="size-4" />
                          )}
                          <span className="sr-only">Refresh</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          title="Edit"
                          disabled={busy}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          title="Delete"
                          disabled={busy}
                          onClick={() => setDeleteRow(row)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <FxRateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        rate={editRow}
        existingMonths={existingMonths}
        onSaved={() => router.refresh()}
      />

      <AlertDialog
        open={deleteRow !== null}
        onOpenChange={(open) => !open && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this FX rate?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `The stored rates for ${formatMonthLabel(deleteRow.month)} will be removed. Conversions for that month will fall back to the nearest available rate.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function formatRate(value: number): string {
  return value.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatMonthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}
