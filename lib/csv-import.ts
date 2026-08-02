/**
 * Pure parsing helpers for CSV statement imports.
 *
 * Lives outside the server-action file because "use server" modules may only
 * export async functions.
 */

/** How a statement's columns map onto our fields. Stored per import batch. */
export interface ColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  /** Single signed amount column. */
  amountColumn?: string;
  /** Or a separate debit/credit pair. */
  debitColumn?: string;
  creditColumn?: string;
  dateFormat: "DMY" | "MDY" | "YMD";
  /** In the source file, is a spend positive or negative? */
  spendSign: "positive" | "negative";
}

/** One parsed CSV row: raw cells keyed by header. */
export type RawRow = Record<string, string>;

/** Parses a date cell into "YYYY-MM-DD" using the explicitly chosen format. */
export function parseDateCell(
  value: string,
  format: ColumnMapping["dateFormat"],
): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();

  // ISO-ish input always wins, regardless of the chosen format.
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parts = trimmed.split(/[/.\-\s]+/).filter(Boolean);
  if (parts.length < 3) return null;

  let day: string, month: string, year: string;
  if (format === "YMD") {
    [year, month, day] = parts;
  } else if (format === "MDY") {
    [month, day, year] = parts;
  } else {
    [day, month, year] = parts;
  }

  if (!day || !month || !year) return null;
  if (year.length === 2) year = `20${year}`;
  if (!/^\d{4}$/.test(year)) return null;

  const d = Number(day);
  const m = Number(month);
  if (!Number.isInteger(d) || !Number.isInteger(m)) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;

  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Parses a money cell, tolerating currency symbols, thousands separators and
 * accounting-style (parentheses) negatives.
 */
export function parseAmountCell(value: string): number | null {
  if (value === undefined || value === null) return null;
  let text = String(value).trim();
  if (!text) return null;

  const negatedByParens = /^\(.*\)$/.test(text);
  if (negatedByParens) text = text.slice(1, -1);

  // Strip everything except digits, separators and sign.
  text = text.replace(/[^\d.,-]/g, "");
  if (!text) return null;

  // If both separators appear, the last one is the decimal separator.
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // A lone comma is a decimal separator when it splits 1-2 trailing digits.
    const after = text.length - lastComma - 1;
    text = after <= 2 ? text.replace(",", ".") : text.replace(/,/g, "");
  }

  const num = Number.parseFloat(text);
  if (!Number.isFinite(num)) return null;
  return negatedByParens ? -Math.abs(num) : num;
}

/**
 * Normalises one raw row to a spend-positive amount, or null if unusable.
 * Spend is always stored positive; refunds/credits are negative.
 */
export function normaliseRow(
  row: RawRow,
  mapping: ColumnMapping,
): { date: string; description: string; amount: number } | null {
  const date = parseDateCell(row[mapping.dateColumn] ?? "", mapping.dateFormat);
  if (!date) return null;

  const description = (row[mapping.descriptionColumn] ?? "").trim();

  let amount: number | null = null;
  if (mapping.debitColumn || mapping.creditColumn) {
    const debit = mapping.debitColumn
      ? parseAmountCell(row[mapping.debitColumn] ?? "")
      : null;
    const credit = mapping.creditColumn
      ? parseAmountCell(row[mapping.creditColumn] ?? "")
      : null;
    if (debit !== null && debit !== 0) {
      amount = Math.abs(debit); // debit column = spend
    } else if (credit !== null && credit !== 0) {
      amount = -Math.abs(credit); // credit column = refund
    } else {
      return null;
    }
  } else if (mapping.amountColumn) {
    const raw = parseAmountCell(row[mapping.amountColumn] ?? "");
    if (raw === null || raw === 0) return null;
    // Store spend as positive regardless of the file's convention.
    amount = mapping.spendSign === "negative" ? -raw : raw;
  } else {
    return null;
  }

  if (amount === null || !Number.isFinite(amount)) return null;
  return { date, description, amount };
}
