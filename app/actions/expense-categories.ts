"use server";

import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { expenseCategories } from "@/db/schema";
import { getUserId } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  excludeFromSpend: boolean;
  /** Monthly spending target in GBP; null = no target set. */
  monthlyTarget: number | null;
  /** Fixed costs (rent, utilities…) group separately from variable spending. */
  isFixed: boolean;
  displayOrder: number;
  archivedAt: string | null;
}

export interface CategoryInput {
  name: string;
  color: string;
  excludeFromSpend: boolean;
  monthlyTarget?: number | null;
  isFixed?: boolean;
}

export interface CategoryMutationResult {
  success: boolean;
  error?: string;
}

/**
 * Starter set seeded on a user's first visit to the budget page, so nobody
 * starts from an empty list. "Payments & Transfers" is excluded from spend —
 * a credit-card payment is a transfer, not spending.
 */
const STARTER_CATEGORIES: Array<CategoryInput> = [
  { name: "Groceries", color: "green", excludeFromSpend: false },
  { name: "Dining", color: "orange", excludeFromSpend: false },
  { name: "Transport", color: "blue", excludeFromSpend: false },
  { name: "Housing", color: "amber", excludeFromSpend: false, isFixed: true },
  { name: "Utilities", color: "teal", excludeFromSpend: false, isFixed: true },
  { name: "Shopping", color: "pink", excludeFromSpend: false },
  { name: "Health", color: "rose", excludeFromSpend: false },
  { name: "Travel", color: "cyan", excludeFromSpend: false },
  { name: "Subscriptions", color: "purple", excludeFromSpend: false, isFixed: true },
  { name: "Other", color: "indigo", excludeFromSpend: false },
  { name: "Payments & Transfers", color: "lime", excludeFromSpend: true },
];

function toRow(row: typeof expenseCategories.$inferSelect): CategoryRow {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    excludeFromSpend: row.excludeFromSpend,
    monthlyTarget:
      row.monthlyTarget !== null && row.monthlyTarget !== undefined
        ? Number(row.monthlyTarget)
        : null,
    isFixed: row.isFixed ?? false,
    displayOrder: row.displayOrder,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
}

/**
 * Reads all of a user's category rows, tolerating a database that hasn't run
 * the monthly_target / is_fixed migration yet — pages keep rendering and
 * targets simply read as unset until the columns exist.
 */
async function loadCategoryRows(userId: string): Promise<CategoryRow[]> {
  try {
    const rows = await db
      .select()
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId))
      .orderBy(asc(expenseCategories.displayOrder), asc(expenseCategories.name));
    return rows.map(toRow);
  } catch (err) {
    console.error(
      "Categories: falling back to pre-migration columns (run the 0003 migration):",
      err,
    );
    const rows = await db
      .select({
        id: expenseCategories.id,
        name: expenseCategories.name,
        color: expenseCategories.color,
        excludeFromSpend: expenseCategories.excludeFromSpend,
        displayOrder: expenseCategories.displayOrder,
        archivedAt: expenseCategories.archivedAt,
      })
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId))
      .orderBy(asc(expenseCategories.displayOrder), asc(expenseCategories.name));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      excludeFromSpend: r.excludeFromSpend,
      monthlyTarget: null,
      isFixed: false,
      displayOrder: r.displayOrder,
      archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
    }));
  }
}

async function seedStarterCategories(userId: string): Promise<void> {
  try {
    await db.insert(expenseCategories).values(
      STARTER_CATEGORIES.map((c, i) => ({
        userId,
        name: c.name,
        color: c.color,
        excludeFromSpend: c.excludeFromSpend,
        isFixed: c.isFixed ?? false,
        displayOrder: i,
      })),
    );
  } catch {
    // Pre-migration database: seed without the new column.
    await db.insert(expenseCategories).values(
      STARTER_CATEGORIES.map((c, i) => ({
        userId,
        name: c.name,
        color: c.color,
        excludeFromSpend: c.excludeFromSpend,
        displayOrder: i,
      })),
    );
  }
}

/**
 * Lists the user's active categories, seeding the starter set the first time.
 * Pass includeArchived to also return soft-deleted ones.
 */
export async function getCategories(
  includeArchived = false,
): Promise<CategoryRow[]> {
  const userId = await getUserId();

  let rows = await loadCategoryRows(userId);

  if (rows.length === 0) {
    await seedStarterCategories(userId);
    rows = await loadCategoryRows(userId);
    return rows;
  }

  return rows.filter((r) => includeArchived || r.archivedAt === null);
}

function validate(input: CategoryInput): string | null {
  if (!input.name || input.name.trim().length === 0) {
    return "Name is required.";
  }
  if (input.name.trim().length > 60) {
    return "Name must be 60 characters or fewer.";
  }
  if (
    input.monthlyTarget !== null &&
    input.monthlyTarget !== undefined &&
    (!Number.isFinite(input.monthlyTarget) || input.monthlyTarget < 0)
  ) {
    return "Target must be a positive amount.";
  }
  return null;
}

function targetToDb(input: CategoryInput): string | null {
  return input.monthlyTarget !== null &&
    input.monthlyTarget !== undefined &&
    input.monthlyTarget > 0
    ? String(input.monthlyTarget)
    : null;
}

async function isDuplicateName(
  userId: string,
  name: string,
  excludeId?: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.userId, userId),
        isNull(expenseCategories.archivedAt),
      ),
    );
  const target = name.trim().toLowerCase();
  return rows.some((r) => r.name.toLowerCase() === target && r.id !== excludeId);
}

export async function createCategory(
  input: CategoryInput,
): Promise<CategoryMutationResult> {
  const userId = await getUserId();

  const invalid = validate(input);
  if (invalid) return { success: false, error: invalid };

  if (await isDuplicateName(userId, input.name)) {
    return { success: false, error: "A category with that name already exists." };
  }

  try {
    const existing = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(eq(expenseCategories.userId, userId));

    await db.insert(expenseCategories).values({
      userId,
      name: input.name.trim(),
      color: input.color,
      excludeFromSpend: input.excludeFromSpend,
      monthlyTarget: targetToDb(input),
      isFixed: input.isFixed ?? false,
      displayOrder: existing.length,
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create category.",
    };
  }

  revalidatePaths();
  return { success: true };
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
): Promise<CategoryMutationResult> {
  const userId = await getUserId();

  const invalid = validate(input);
  if (invalid) return { success: false, error: invalid };

  if (await isDuplicateName(userId, input.name, id)) {
    return { success: false, error: "A category with that name already exists." };
  }

  try {
    const updated = await db
      .update(expenseCategories)
      .set({
        name: input.name.trim(),
        color: input.color,
        excludeFromSpend: input.excludeFromSpend,
        monthlyTarget: targetToDb(input),
        isFixed: input.isFixed ?? false,
        updatedAt: new Date(),
      })
      .where(
        and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)),
      )
      .returning({ id: expenseCategories.id });

    if (updated.length === 0) {
      return { success: false, error: "Category not found." };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update category.",
    };
  }

  revalidatePaths();
  return { success: true };
}

/**
 * Soft-deletes a category. Existing expenses keep pointing at it so historic
 * spend keeps its label; the category just stops appearing in pickers.
 */
export async function archiveCategory(
  id: string,
): Promise<CategoryMutationResult> {
  const userId = await getUserId();

  try {
    const updated = await db
      .update(expenseCategories)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)),
      )
      .returning({ id: expenseCategories.id });

    if (updated.length === 0) {
      return { success: false, error: "Category not found." };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to archive category.",
    };
  }

  revalidatePaths();
  return { success: true };
}

export async function restoreCategory(
  id: string,
): Promise<CategoryMutationResult> {
  const userId = await getUserId();

  try {
    await db
      .update(expenseCategories)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(
        and(eq(expenseCategories.id, id), eq(expenseCategories.userId, userId)),
      );
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to restore category.",
    };
  }

  revalidatePaths();
  return { success: true };
}

export interface CategoryTargetInput {
  id: string;
  /** GBP per month; null clears the target. */
  monthlyTarget: number | null;
}

/**
 * Batch-set monthly targets — the "set your budget" screen saves every
 * category in one call. Only the target changes; names, colours and flags
 * are untouched.
 */
export async function saveCategoryTargets(
  inputs: CategoryTargetInput[],
): Promise<CategoryMutationResult> {
  const userId = await getUserId();

  for (const input of inputs) {
    if (
      input.monthlyTarget !== null &&
      (!Number.isFinite(input.monthlyTarget) || input.monthlyTarget < 0)
    ) {
      return { success: false, error: "Targets must be positive amounts." };
    }
  }

  try {
    for (const input of inputs) {
      await db
        .update(expenseCategories)
        .set({
          monthlyTarget:
            input.monthlyTarget !== null && input.monthlyTarget > 0
              ? String(input.monthlyTarget)
              : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(expenseCategories.id, input.id),
            eq(expenseCategories.userId, userId),
          ),
        );
    }
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to save targets — has the targets migration run?",
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
