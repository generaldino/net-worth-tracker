const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-03" → "March 2026". Returns null if the string is malformed. */
function formatMonth(month: unknown): string | null {
  if (typeof month !== "string") return null;
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return `${MONTH_NAMES[monthIdx]} ${year}`;
}

/**
 * Map a tool name + input to a human-friendly status label shown while the
 * tool is running. If the input is still streaming or the shape doesn't
 * match, fall back to a sensible generic label.
 */
export function humanizeToolCall(
  toolName: string,
  input: unknown,
): string {
  const i = (input ?? {}) as Record<string, unknown>;

  switch (toolName) {
    case "list_accounts":
      return "Listing your accounts…";

    case "get_net_worth_summary":
      return "Calculating your current net worth…";

    case "get_monthly_metrics": {
      const m = formatMonth(i.month);
      return m ? `Looking at ${m}…` : "Looking at that month…";
    }

    case "compare_months": {
      const a = formatMonth(i.monthA);
      const b = formatMonth(i.monthB);
      if (a && b) return `Comparing ${a} with ${b}…`;
      return "Comparing those two months…";
    }

    case "get_time_series": {
      const months = Number(i.months);
      if (Number.isFinite(months) && months > 0) {
        return `Building a ${months}-month net worth trend…`;
      }
      return "Building your net worth trend…";
    }

    case "get_account_history": {
      const months = Number(i.limit);
      if (Number.isFinite(months) && months > 0) {
        return `Pulling the last ${months} months for that account…`;
      }
      return "Pulling that account's history…";
    }

    default:
      // Unknown tool — fall back to the raw name in code style.
      return `Running ${toolName}…`;
  }
}
