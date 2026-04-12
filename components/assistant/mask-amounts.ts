const CURRENCY_AMOUNT_RE =
  /[£$€](?:\s?-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|\s?-?\d+(?:\.\d+)?)|\d{1,3}(?:,\d{3})*(?:\.\d+)?\s?(?:AED|د\.إ)/gi;

export function maskAbsoluteAmounts(text: string): string {
  return text.replace(CURRENCY_AMOUNT_RE, "••••");
}
