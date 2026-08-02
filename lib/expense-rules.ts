/**
 * Rule matching for auto-categorising expenses.
 *
 * A rule is a lowercased substring (usually a merchant fragment like "tesco")
 * mapped to a category. The highest-priority matching rule wins; ties break on
 * the longest match, so a specific rule ("amazon prime") beats a general one
 * ("amazon").
 */

export interface MatchableRule {
  matchText: string;
  categoryId: string;
  priority: number;
}

/** Normalises a statement description for matching, grouping and storage. */
export function normaliseDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 &'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Best-effort merchant name from a raw statement description. Statement lines
 * carry trailing noise (card numbers, dates, locations, reference codes); this
 * keeps the leading words, which are almost always the merchant.
 */
export function extractMerchant(description: string): string {
  const normalised = normaliseDescription(description);
  if (!normalised) return "";
  const withoutTrailingNumbers = normalised
    .replace(/\b\d{2,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const source = withoutTrailingNumbers || normalised;
  return source.split(" ").slice(0, 3).join(" ");
}

/** Returns the categoryId of the best matching rule, or null if none match. */
export function matchCategory(
  description: string,
  rules: MatchableRule[],
): string | null {
  const haystack = normaliseDescription(description);
  if (!haystack) return null;

  let best: MatchableRule | null = null;
  for (const rule of rules) {
    const needle = normaliseDescription(rule.matchText);
    if (!needle || !haystack.includes(needle)) continue;
    if (
      best === null ||
      rule.priority > best.priority ||
      (rule.priority === best.priority &&
        needle.length > normaliseDescription(best.matchText).length)
    ) {
      best = rule;
    }
  }
  return best ? best.categoryId : null;
}
