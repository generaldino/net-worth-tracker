"use client";

import { Card } from "@/components/ui/card";
import { formatCurrencyAmount, formatPercentage } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";
import { Eye, EyeOff } from "lucide-react";

interface AssetCard {
  type: string;
  originalName: string;
  amount: number;
  percentage: number;
  color: string;
  isHidden: boolean;
}

interface NetWorthCardsProps {
  netWorth: number;
  assets: Array<{
    name: string;
    value: number;
    absValue: number;
  }>;
  chartCurrency: Currency;
  getColor: (name: string, index: number, allNames: string[]) => string;
  allAccountTypeNames: string[];
  isPercentageView?: boolean;
  hoveredCardName?: string | null;
  onCardHover?: (cardName: string | null) => void;
  hiddenCards?: Set<string>;
  onToggleHidden?: (cardName: string) => void;
}

export function NetWorthCards({
  netWorth,
  assets,
  chartCurrency,
  getColor,
  allAccountTypeNames,
  isPercentageView = false,
  onCardHover,
  hiddenCards = new Set(),
  onToggleHidden,
}: NetWorthCardsProps) {
  const { isMasked } = useMasking();

  // Format account type name
  const formatAccountTypeName = (type: string): string => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Convert assets to card format with colors
  const assetCards: AssetCard[] = assets.map((asset, index) => {
    const colorHex = getColor(asset.name, index, allAccountTypeNames);
    const isHidden = hiddenCards.has(asset.name);

    // Calculate percentage for the bar
    // In percentage view, asset.value is already a percentage (0-100), use absValue for bar
    // In absolute view, calculate percentage from absolute value
    const percentage = isPercentageView
      ? asset.absValue
      : netWorth !== 0
      ? (asset.value / Math.abs(netWorth)) * 100
      : 0;

    return {
      type: formatAccountTypeName(asset.name),
      originalName: asset.name, // Keep original name for hover matching
      amount: asset.value, // This will be percentage in percentage view, absolute in absolute view
      percentage: percentage,
      color: colorHex, // Store hex color for inline style
      isHidden,
    };
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
      {assetCards.map((asset) => {
        return (
          <Card
            key={asset.type}
            className={`p-5 hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border group min-w-[240px] flex-shrink-0 relative ${
              asset.isHidden ? "opacity-40" : ""
            }`}
            onMouseEnter={() => onCardHover?.(asset.originalName)}
            onMouseLeave={() => onCardHover?.(null)}
          >
            {/* Hide/Show toggle button */}
            {onToggleHidden && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleHidden(asset.originalName);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title={asset.isHidden ? "Show in chart" : "Hide from chart"}
              >
                {asset.isHidden ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full group-hover:scale-125 transition-transform ${
                    asset.isHidden ? "opacity-50" : ""
                  }`}
                  style={{ backgroundColor: asset.color }}
                />
                <p className={`text-sm font-medium text-muted-foreground ${
                  asset.isHidden ? "line-through" : ""
                }`}>
                  {asset.type}
                </p>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  asset.amount < 0 ? "text-red-600" : "text-foreground"
                } ${asset.isHidden ? "line-through opacity-60" : ""}`}
              >
                {isMasked
                  ? "••••••"
                  : isPercentageView
                  ? formatPercentage(Math.abs(asset.amount))
                  : formatCurrencyAmount(asset.amount, chartCurrency)}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      asset.isHidden ? "opacity-30" : ""
                    }`}
                    style={{
                      width: `${Math.abs(asset.percentage)}%`,
                      backgroundColor: asset.color,
                    }}
                  />
                </div>
                <p
                  className={`text-xs font-semibold font-mono tabular-nums ${
                    asset.percentage < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatPercentage(asset.percentage)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
