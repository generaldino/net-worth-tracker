"use client";

import { Card } from "@/components/ui/card";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";
import { useMasking } from "@/contexts/masking-context";

interface AssetCard {
  type: string;
  originalName: string;
  amount: number;
  percentage: number;
  color: string;
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
}

export function NetWorthCards({
  netWorth,
  assets,
  chartCurrency,
  getColor,
  allAccountTypeNames,
  isPercentageView = false,
  hoveredCardName,
  onCardHover,
}: NetWorthCardsProps) {
  const { isMasked } = useMasking();

  // Format account type name
  const formatAccountTypeName = (type: string): string => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Convert assets to card format with colors
  const assetCards: AssetCard[] = assets.map((asset, index) => {
    const colorHex = getColor(asset.name, index, allAccountTypeNames);

    // Calculate percentage for the bar
    // In percentage view, asset.value is already a percentage (0-100), use absValue for bar
    // In absolute view, calculate percentage from absolute value
    const percentage = isPercentageView
      ? parseFloat(asset.absValue.toFixed(1))
      : netWorth !== 0
      ? parseFloat(((asset.value / Math.abs(netWorth)) * 100).toFixed(1))
      : 0;

    return {
      type: formatAccountTypeName(asset.name),
      originalName: asset.name, // Keep original name for hover matching
      amount: asset.value, // This will be percentage in percentage view, absolute in absolute view
      percentage: percentage,
      color: colorHex, // Store hex color for inline style
    };
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
      {assetCards.map((asset) => {
        const isHovered = hoveredCardName === asset.originalName;
        const hasHover = hoveredCardName !== null;
        const opacity = hasHover ? (isHovered ? 1 : 0.3) : 1;

        return (
          <Card
            key={asset.type}
            className="p-5 hover:shadow-lg transition-all duration-300 border-border/50 hover:border-border group min-w-[240px] flex-shrink-0"
            onMouseEnter={() => onCardHover?.(asset.originalName)}
            onMouseLeave={() => onCardHover?.(null)}
            style={{ opacity }}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full group-hover:scale-125 transition-transform"
                  style={{ backgroundColor: asset.color }}
                />
                <p className="text-sm font-medium text-muted-foreground">
                  {asset.type}
                </p>
              </div>
              <p
                className={`text-2xl font-bold tracking-tight ${
                  asset.amount < 0 ? "text-red-600" : "text-foreground"
                }`}
              >
                {isMasked
                  ? "••••••"
                  : isPercentageView
                  ? `${Math.abs(asset.amount).toFixed(0)}%`
                  : formatCurrencyAmount(asset.amount, chartCurrency)}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
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
                  {asset.percentage.toFixed(0)}%
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
