"use client";

import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import {
  getLastMapping,
  importExpenses,
  previewImport,
  type ColumnMapping,
  type ImportPreview,
  type RawRow,
} from "@/app/actions/expense-import";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Array<{ id: string; name: string; type: string }>;
  onImported: () => void;
}

type Step = "file" | "map" | "confirm";

const NO_ACCOUNT = "__none__";
const NO_COLUMN = "__none__";

export function ImportDialog({
  open,
  onOpenChange,
  accounts,
  onImported,
}: ImportDialogProps) {
  const [step, setStep] = useState<Step>("file");
  const [accountId, setAccountId] = useState<string>(NO_ACCOUNT);
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateColumn: "",
    descriptionColumn: "",
    amountColumn: "",
    dateFormat: "DMY",
    spendSign: "positive",
  });
  const [useDebitCredit, setUseDebitCredit] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    // Reset on close so the next import starts clean.
    setStep("file");
    setFilename("");
    setHeaders([]);
    setRows([]);
    setPreview(null);
    setUseDebitCredit(false);
    setMapping({
      dateColumn: "",
      descriptionColumn: "",
      amountColumn: "",
      dateFormat: "DMY",
      spendSign: "positive",
    });
  }, [open]);

  const guessColumn = (candidates: string[], available: string[]) => {
    for (const candidate of candidates) {
      const hit = available.find((h) => h.toLowerCase().includes(candidate));
      if (hit) return hit;
    }
    return "";
  };

  const handleFile = (file: File) => {
    setFilename(file.name);
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      // Bank exports vary (comma, semicolon, tab) — let Papa detect it.
      complete: async (result) => {
        const parsedRows = (result.data ?? []).filter(
          (r) => r && Object.keys(r).length > 0,
        );
        const fields = (result.meta.fields ?? []).filter(Boolean);

        if (fields.length === 0 || parsedRows.length === 0) {
          toast({
            variant: "destructive",
            title: "Could not read that file",
            description:
              "No rows with a header line were found. Check it's a CSV export.",
          });
          return;
        }

        setHeaders(fields);
        setRows(parsedRows);

        // Prefer this account's last mapping; otherwise guess from header names.
        let next: ColumnMapping | null = null;
        if (accountId !== NO_ACCOUNT) {
          next = await getLastMapping(accountId);
        }
        if (next && fields.includes(next.dateColumn)) {
          setMapping(next);
          setUseDebitCredit(Boolean(next.debitColumn || next.creditColumn));
        } else {
          setMapping({
            dateColumn: guessColumn(["date", "posted"], fields),
            descriptionColumn: guessColumn(
              ["description", "details", "narrative", "merchant", "payee", "reference"],
              fields,
            ),
            amountColumn: guessColumn(["amount", "value"], fields),
            dateFormat: "DMY",
            spendSign: "positive",
          });
        }
        setStep("map");
      },
      error: (err) => {
        toast({
          variant: "destructive",
          title: "Could not read that file",
          description: err.message,
        });
      },
    });
  };

  const mappingComplete =
    mapping.dateColumn &&
    mapping.descriptionColumn &&
    (useDebitCredit
      ? mapping.debitColumn || mapping.creditColumn
      : mapping.amountColumn);

  const effectiveMapping = (): ColumnMapping =>
    useDebitCredit
      ? { ...mapping, amountColumn: undefined }
      : { ...mapping, debitColumn: undefined, creditColumn: undefined };

  const handlePreview = async () => {
    setIsBusy(true);
    const result = await previewImport(
      accountId === NO_ACCOUNT ? null : accountId,
      effectiveMapping(),
      rows,
    );
    setIsBusy(false);
    setPreview(result);
    setStep("confirm");
  };

  const handleImport = async () => {
    setIsBusy(true);
    const result = await importExpenses(
      accountId === NO_ACCOUNT ? null : accountId,
      filename,
      effectiveMapping(),
      rows,
    );
    setIsBusy(false);

    if (result.success) {
      toast({
        title: "Import complete",
        description: `Added ${result.imported} expense${result.imported === 1 ? "" : "s"}${
          result.skipped ? `, skipped ${result.skipped} duplicate/unreadable` : ""
        }.`,
      });
      onImported();
      onOpenChange(false);
    } else {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: result.error,
      });
    }
  };

  const sampleRows = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import statement</DialogTitle>
          <DialogDescription>
            {step === "file" &&
              "Pick the card the statement belongs to, then choose the CSV file."}
            {step === "map" &&
              "Tell us which columns are which. We remember this for next time."}
            {step === "confirm" && "Check what's about to be imported."}
          </DialogDescription>
        </DialogHeader>

        {step === "file" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="import-account">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="import-account">
                  <SelectValue placeholder="Select a card or account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ACCOUNT}>Not linked</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Linking to an account sets the currency and keeps duplicate
                detection scoped to that card.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-file">CSV file</Label>
              <Input
                id="import-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </div>
        )}

        {step === "map" && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date column</Label>
                <Select
                  value={mapping.dateColumn || NO_COLUMN}
                  onValueChange={(v) =>
                    setMapping((m) => ({
                      ...m,
                      dateColumn: v === NO_COLUMN ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date format</Label>
                <Select
                  value={mapping.dateFormat}
                  onValueChange={(v) =>
                    setMapping((m) => ({
                      ...m,
                      dateFormat: v as ColumnMapping["dateFormat"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DMY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MDY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YMD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Description column</Label>
                <Select
                  value={mapping.descriptionColumn || NO_COLUMN}
                  onValueChange={(v) =>
                    setMapping((m) => ({
                      ...m,
                      descriptionColumn: v === NO_COLUMN ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={useDebitCredit ? "outline" : "default"}
                size="sm"
                onClick={() => setUseDebitCredit(false)}
              >
                One amount column
              </Button>
              <Button
                type="button"
                variant={useDebitCredit ? "default" : "outline"}
                size="sm"
                onClick={() => setUseDebitCredit(true)}
              >
                Separate debit / credit
              </Button>
            </div>

            {useDebitCredit ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Debit (money out)</Label>
                  <Select
                    value={mapping.debitColumn || NO_COLUMN}
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...m,
                        debitColumn: v === NO_COLUMN ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COLUMN}>None</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Credit (money in)</Label>
                  <Select
                    value={mapping.creditColumn || NO_COLUMN}
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...m,
                        creditColumn: v === NO_COLUMN ? undefined : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_COLUMN}>None</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount column</Label>
                  <Select
                    value={mapping.amountColumn || NO_COLUMN}
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...m,
                        amountColumn: v === NO_COLUMN ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>In this file, spending is</Label>
                  <Select
                    value={mapping.spendSign}
                    onValueChange={(v) =>
                      setMapping((m) => ({
                        ...m,
                        spendSign: v as ColumnMapping["spendSign"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">
                        Positive (50.00 = spent)
                      </SelectItem>
                      <SelectItem value="negative">
                        Negative (-50.00 = spent)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Live preview of how the mapping reads the file */}
            {sampleRows.length > 0 && mappingComplete && (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Preview — check the dates and amounts look right
                </p>
                <div className="space-y-1">
                  {sampleRows.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {r[mapping.dateColumn]}
                      </span>
                      <span className="flex-1 truncate">
                        {r[mapping.descriptionColumn]}
                      </span>
                      <span className="tabular-nums">
                        {useDebitCredit
                          ? `${mapping.debitColumn ? r[mapping.debitColumn] ?? "" : ""} ${
                              mapping.creditColumn
                                ? r[mapping.creditColumn] ?? ""
                                : ""
                            }`.trim()
                          : r[mapping.amountColumn ?? ""]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === "confirm" && preview && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="To import" value={preview.total - preview.duplicates} />
              <Stat label="Duplicates" value={preview.duplicates} muted />
              <Stat label="Auto-categorised" value={preview.autoCategorised} />
              <Stat label="Uncategorised" value={preview.uncategorised} />
            </div>

            {preview.duplicates > 0 && (
              <p className="text-xs text-muted-foreground">
                Duplicates were already imported and will be skipped.
              </p>
            )}

            {preview.invalid > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                <AlertTriangle className="mt-0.5 size-4 text-amber-600" />
                <p className="text-xs">
                  {preview.invalid} row{preview.invalid === 1 ? "" : "s"} couldn&apos;t
                  be read and will be skipped. If that seems high, go back and
                  check the column mapping and date format.
                </p>
              </div>
            )}

            <div className="rounded-lg border max-h-[240px] overflow-y-auto">
              {preview.rows.slice(0, 40).map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 border-b px-3 py-1.5 text-xs last:border-b-0"
                >
                  <span className="text-muted-foreground tabular-nums">
                    {r.date}
                  </span>
                  <span className="flex-1 truncate">{r.description}</span>
                  {r.duplicate && (
                    <span className="text-[10px] uppercase text-muted-foreground">
                      dupe
                    </span>
                  )}
                  <span className="tabular-nums">{r.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "map" && (
            <Button variant="outline" onClick={() => setStep("file")}>
              Back
            </Button>
          )}
          {step === "confirm" && (
            <Button variant="outline" onClick={() => setStep("map")}>
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy}
          >
            Cancel
          </Button>
          {step === "map" && (
            <Button onClick={handlePreview} disabled={!mappingComplete || isBusy}>
              {isBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Continue
            </Button>
          )}
          {step === "confirm" && preview && (
            <Button
              onClick={handleImport}
              disabled={isBusy || preview.total - preview.duplicates === 0}
            >
              {isBusy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              Import {preview.total - preview.duplicates}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-semibold tabular-nums ${muted ? "text-muted-foreground" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
