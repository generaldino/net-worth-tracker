export const colorVariantsBackground = {
  amber: "bg-amber-400",
  blue: "bg-blue-300",
  red: "bg-red-300",
  green: "bg-emerald-300",
  purple: "bg-purple-300",
} as const;

export const colorVariantsHeading = {
  amber: "text-amber-800",
  blue: "text-blue-800",
  red: "text-red-800",
  green: "text-emerald-800",
  purple: "text-purple-800",
} as const;

export const colorVariantsParagraph = {
  amber: "text-amber-300",
  blue: "text-blue-200",
  red: "text-red-200",
  green: "text-emerald-700",
  purple: "text-purple-200",
};

export type ColorVariant = keyof typeof colorVariantsBackground;
