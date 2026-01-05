export const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
];

// Standard green and red colors matching Tailwind's green-600 and red-600
// These match the exact HSL values used by Tailwind CSS
export const CHART_GREEN = "hsl(142, 71%, 41%)"; // Tailwind green-600
export const CHART_RED = "hsl(0, 84%, 60%)"; // Tailwind red-600

export const SOURCE_KEYS = [
  "Savings from Income",
  "Interest Earned",
  "Capital Gains",
];

/**
 * Map account types to their hex colors matching Tailwind colors used in account type badges
 * These colors match the -500 variants used in the accounts table badges
 */
export const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  Current: "#3b82f6",      // blue-500
  Savings: "#22c55e",       // green-500
  Investment: "#8b5cf6",    // violet-500
  Stock: "#6366f1",         // indigo-500
  Crypto: "#f97316",        // orange-500
  Pension: "#64748b",       // slate-500
  Commodity: "#f59e0b",     // amber-500
  Stock_options: "#ec4899", // pink-500
  Credit_Card: "#ef4444",   // red-500
  Loan: "#f43f5e",          // rose-500
  Asset: "#0ea5e9",         // sky-500
};

/**
 * Checks if a string is a known account type
 */
export function isAccountType(type: string): boolean {
  return type in ACCOUNT_TYPE_COLORS;
}

/**
 * Gets the color for an account type based on the account type badges used in the accounts table
 * Falls back to getUniqueColor if the account type is not found
 */
export function getAccountTypeColor(accountType: string): string {
  // Normalize account type name (preserve underscores as they are in the mapping)
  const normalized = accountType.trim();
  return ACCOUNT_TYPE_COLORS[normalized] || getUniqueColor(0);
}

/**
 * Generates a unique color for each index by creating variations of base colors
 * Ensures each item gets a distinct color even when there are more items than base colors
 */
export function getUniqueColor(index: number): string {
  // Base colors to cycle through
  const baseColors = COLORS;

  if (index < baseColors.length) {
    // Use base colors for first items
    return baseColors[index];
  }

  // For indices beyond base colors, generate variations using HSL
  const baseIndex = index % baseColors.length;
  const variation = Math.floor(index / baseColors.length);

  // Convert hex to RGB
  const hex = baseColors[baseIndex];
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Convert RGB to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) {
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / d + 2) / 6;
    } else {
      h = ((r - g) / d + 4) / 6;
    }
  }

  // Create variations by shifting hue and adjusting lightness
  const hueShift = (variation * 30) % 360; // Shift hue by 30 degrees per variation
  const newH = (h * 360 + hueShift) % 360;
  const newL = Math.max(0.3, Math.min(0.7, l - variation * 0.05)); // Slight lightness variation
  const newS = Math.max(
    0.4,
    Math.min(1, s + (variation % 2 === 0 ? 0.1 : -0.1))
  ); // Alternate saturation

  // Convert HSL back to RGB
  const c = (1 - Math.abs(2 * newL - 1)) * newS;
  const x = c * (1 - Math.abs(((newH / 60) % 2) - 1));
  const m = newL - c / 2;

  let newR = 0,
    newG = 0,
    newB = 0;
  if (newH < 60) {
    newR = c;
    newG = x;
    newB = 0;
  } else if (newH < 120) {
    newR = x;
    newG = c;
    newB = 0;
  } else if (newH < 180) {
    newR = 0;
    newG = c;
    newB = x;
  } else if (newH < 240) {
    newR = 0;
    newG = x;
    newB = c;
  } else if (newH < 300) {
    newR = x;
    newG = 0;
    newB = c;
  } else {
    newR = c;
    newG = 0;
    newB = x;
  }

  // Convert to 0-255 range and back to hex
  const finalR = Math.round((newR + m) * 255);
  const finalG = Math.round((newG + m) * 255);
  const finalB = Math.round((newB + m) * 255);

  return `#${finalR.toString(16).padStart(2, "0")}${finalG
    .toString(16)
    .padStart(2, "0")}${finalB.toString(16).padStart(2, "0")}`;
}
