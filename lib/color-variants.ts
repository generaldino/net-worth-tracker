export const colorVariantsBackground = {
  amber: "bg-amber-300",
  blue: "bg-blue-300",
  red: "bg-red-300",
  green: "bg-emerald-300",
  purple: "bg-purple-300",
  orange: "bg-orange-300",
  pink: "bg-pink-300",
  teal: "bg-teal-300",
  cyan: "bg-cyan-300",
  lime: "bg-lime-300",
  indigo: "bg-indigo-300",
  fuchsia: "bg-fuchsia-300",
  rose: "bg-rose-300",
} as const;

export const colorVariantsHeading = {
  amber: "text-amber-800",
  blue: "text-blue-800",
  red: "text-red-800",
  green: "text-emerald-800",
  purple: "text-purple-800",
  orange: "text-orange-800",
  pink: "text-pink-800",
  teal: "text-teal-800",
  cyan: "text-cyan-800",
  lime: "text-lime-800",
  indigo: "text-indigo-800",
  fuchsia: "text-fuchsia-800",
  rose: "text-rose-800",
} as const;

export const colorVariantsParagraph = {
  amber: "text-amber-700",
  blue: "text-blue-700",
  red: "text-red-700",
  green: "text-emerald-700",
  purple: "text-purple-700",
  orange: "text-orange-700",
  pink: "text-pink-700",
  teal: "text-teal-700",
  cyan: "text-cyan-700",
  lime: "text-lime-700",
  indigo: "text-indigo-700",
  fuchsia: "text-fuchsia-700",
  rose: "text-rose-700",
};

export type ColorVariant = keyof typeof colorVariantsBackground;
