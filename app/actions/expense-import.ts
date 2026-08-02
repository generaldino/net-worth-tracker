"use server";

import { createHash } from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categoryRules,
  expenses,
  importBatches,
  financialAccounts as accountsTable,
} from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import type { Currency } from "@/lib/fx-rates";
import {
  extractMerchant,
  matchCategory,
  normaliseDescription,
} from "@/lib/expense-rules";
import { normaliseRow, type ColumnMapping, type RawRow } from "@/lib/csv-import";
import { revalidatePath } from "next/cache";

export type { ColumnMapping, RawRow };

export interface ImportPreviewRow {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  duplicate: boolean;
  categoryId: string | null;
}

export interface ImportPreview {
  rows: ImportPreviewRow[];
  total: number;
  duplicates: number;
  autoCategorised: number;
  uncategorised: number;
  invalid: number;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  imported?: number;
  skipped?: number;
  batchId?: string;
}

/**
 * Stable identity for an imported row, so re-importing an overlapping
 * statement period doesn't duplicate anything.
 */
function computeDedupeHash(
  accountId: string | null,
  date: string,
  amount: number,
  description: string,
): string {
  return createHash("sha256")
    .update(
      [
        accountId ?? "no-account",
        date,
        amount.toFixed(2),
        normaliseDescription(description),
      ].join("|"),
    )
    .digest("hex");
}

async function loadRules(userId: string) {
  const rows = await db
    .select({
      matchText: categoryRules.matchText,
      categoryId: categoryRules.categoryId,
      priority: categoryRules.priority,
    })
    .from(categoryRules)
    .where(eq(categoryRules.userId, userId))
    .orderBy(desc(categoryRules.priority));
  return rows;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** The column mapping last used for an account, to pre-fill the next import. */
export async function getLastMapping(
  accountId: string,
): Promise<ColumnMapping | null> {
  const userId = await getUserId();
  try {
    const rows = await db
      .select({ columnMapping: importBatches.columnMapping })
      .from(importBatches)
      .where(
        and(
          eq(importBatches.userId, userId),
          eq(importBatches.accountId, accountId),
        ),
      )
      .orderBy(desc(importBatches.importedAt))
      .limit(1);
    return (rows[0]?.columnMapping as ColumnMapping) ?? null;
  } catch (err) {
    console.error("Failed to load last column mapping:", err);
    return null;
  }
}

/**
 * Dry run: normalises rows, flags duplicates and applies rules, without
 * writing anything. Drives the confirm step of the import wizard.
 */
export async function previewImport(
  accountId: string | null,
  mapping: ColumnMapping,
  rows: RawRow[],
): Promise<ImportPreview> {
  const userId = await getUserId();

  const empty: ImportPreview = {
    rows: [],
    total: 0,
    duplicates: 0,
    autoCategorised: 0,
    uncategorised: 0,
    invalid: 0,
  };

  try {
    const rules = await loadRules(userId);

    const existing = await db
      .select({ dedupeHash: expenses.dedupeHash })
      .from(expenses)
      .where(eq(expenses.userId, userId));
    const existingHashes = new Set(
      existing.map((e) => e.dedupeHash).filter(Boolean) as string[],
    );

    const seenInFile = new Set<string>();
    const preview: ImportPreviewRow[] = [];
    let invalid = 0;

    for (const raw of rows) {
      const normalised = normaliseRow(raw, mapping);
      if (!normalised) {
        invalid += 1;
        continue;
      }
      const hash = computeDedupeHash(
        accountId,
        normalised.date,
        normalised.amount,
        normalised.description,
      );
      const duplicate = existingHashes.has(hash) || seenInFile.has(hash);
      seenInFile.add(hash);

      preview.push({
        date: normalised.date,
        description: normalised.description,
        merchant: extractMerchant(normalised.description),
        amount: normalised.amount,
        duplicate,
        categoryId: matchCategory(normalised.description, rules),
      });
    }

    const fresh = preview.filter((r) => !r.duplicate);
    return {
      rows: preview,
      total: preview.length,
      duplicates: preview.length - fresh.length,
      autoCategorised: fresh.filter((r) => r.categoryId !== null).length,
      uncategorised: fresh.filter((r) => r.categoryId === null).length,
      invalid,
    };
  } catch (err) {
    console.error("Failed to preview import:", err);
    return empty;
  }
}

/** Imports the rows, skipping duplicates, and records the batch for undo. */
export async function importExpenses(
  accountId: string | null,
  filename: string,
  mapping: ColumnMapping,
  rows: RawRow[],
): Promise<ImportResult> {
  const userId = await getUserId();

  if (rows.length === 0) {
    return { success: false, error: "No rows to import." };
  }

  try {
    let currency: Currency = "GBP";
    if (accountId) {
      const account = await db
        .select({ currency: accountsTable.currency })
        .from(accountsTable)
        .where(
          and(
            eq(accountsTable.id, accountId),
            eq(accountsTable.userId, userId),
          ),
        )
        .limit(1);
      if (account.length === 0) {
        return { success: false, error: "Account not accessible." };
      }
      currency = (account[0].currency ?? "GBP") as Currency;
    }

    const rules = await loadRules(userId);

    const existing = await db
      .select({ dedupeHash: expenses.dedupeHash })
      .from(expenses)
      .where(eq(expenses.userId, userId));
    const seen = new Set(
      existing.map((e) => e.dedupeHash).filter(Boolean) as string[],
    );

    const toInsert: Array<typeof expenses.$inferInsert> = [];
    let skipped = 0;

    for (const raw of rows) {
      const normalised = normaliseRow(raw, mapping);
      if (!normalised) {
        skipped += 1;
        continue;
      }
      const hash = computeDedupeHash(
        accountId,
        normalised.date,
        normalised.amount,
        normalised.description,
      );
      if (seen.has(hash)) {
        skipped += 1;
        continue;
      }
      seen.add(hash);

      toInsert.push({
        userId,
        date: normalised.date,
        month: normalised.date.slice(0, 7),
        amount: normalised.amount.toString(),
        currency,
        description: normalised.description,
        merchant: extractMerchant(normalised.description),
        categoryId: matchCategory(normalised.description, rules),
        accountId,
        source: "import" as const,
        dedupeHash: hash,
      });
    }

    if (toInsert.length === 0) {
      return {
        success: true,
        imported: 0,
        skipped,
      };
    }

    const batchId = await db.transaction(async (tx) => {
      const [batch] = await tx
        .insert(importBatches)
        .values({
          userId,
          accountId,
          filename,
          rowCount: toInsert.length,
          columnMapping: mapping,
        })
        .returning({ id: importBatches.id });

      await tx
        .insert(expenses)
        .values(toInsert.map((e) => ({ ...e, importBatchId: batch.id })));

      return batch.id;
    });

    revalidatePaths();
    return {
      success: true,
      imported: toInsert.length,
      skipped,
      batchId,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Import failed.",
    };
  }
}

/** Removes a whole import batch — the escape hatch for a wrong mapping. */
export async function deleteImportBatch(
  batchId: string,
): Promise<ImportResult> {
  const userId = await getUserId();

  try {
    await db
      .delete(importBatches)
      .where(
        and(eq(importBatches.id, batchId), eq(importBatches.userId, userId)),
      );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete import.",
    };
  }

  revalidatePaths();
  return { success: true };
}

export interface ImportBatchRow {
  id: string;
  filename: string;
  rowCount: number;
  importedAt: string;
  accountId: string | null;
}

export async function getImportBatches(): Promise<ImportBatchRow[]> {
  const userId = await getUserId();
  try {
    const rows = await db
      .select()
      .from(importBatches)
      .where(eq(importBatches.userId, userId))
      .orderBy(desc(importBatches.importedAt))
      .limit(20);
    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      rowCount: r.rowCount,
      importedAt: r.importedAt.toISOString(),
      accountId: r.accountId,
    }));
  } catch (err) {
    console.error("Failed to load import batches:", err);
    return [];
  }
}

/**
 * Creates a standing rule — offered when you categorise a row by hand, so the
 * same merchant is auto-categorised next time.
 */
export async function createCategoryRule(
  matchText: string,
  categoryId: string,
): Promise<ImportResult> {
  const userId = await getUserId();
  const needle = normaliseDescription(matchText);
  if (!needle) return { success: false, error: "Rule text is required." };

  try {
    const existing = await db
      .select({ id: categoryRules.id })
      .from(categoryRules)
      .where(
        and(
          eq(categoryRules.userId, userId),
          eq(categoryRules.matchText, needle),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(categoryRules)
        .set({ categoryId, updatedAt: new Date() })
        .where(eq(categoryRules.id, existing[0].id));
    } else {
      await db.insert(categoryRules).values({
        userId,
        matchText: needle,
        categoryId,
        priority: 0,
      });
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save rule.",
    };
  }

  revalidatePaths();
  return { success: true };
}

export interface CategoryRuleRow {
  id: string;
  matchText: string;
  categoryId: string;
  priority: number;
}

export async function getCategoryRules(): Promise<CategoryRuleRow[]> {
  const userId = await getUserId();
  try {
    const rows = await db
      .select()
      .from(categoryRules)
      .where(eq(categoryRules.userId, userId))
      .orderBy(desc(categoryRules.priority), asc(categoryRules.matchText));
    return rows.map((r) => ({
      id: r.id,
      matchText: r.matchText,
      categoryId: r.categoryId,
      priority: r.priority,
    }));
  } catch (err) {
    console.error("Failed to load category rules:", err);
    return [];
  }
}

export async function deleteCategoryRule(id: string): Promise<ImportResult> {
  const userId = await getUserId();
  try {
    await db
      .delete(categoryRules)
      .where(and(eq(categoryRules.id, id), eq(categoryRules.userId, userId)));
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete rule.",
    };
  }
  revalidatePaths();
  return { success: true };
}

function revalidatePaths() {
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/accounts");
}
