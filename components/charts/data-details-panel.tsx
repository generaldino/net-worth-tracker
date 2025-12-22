"use client";

import { Button } from "@/components/ui/button";
import type { ClickedData } from "@/components/charts/types";
import { COLORS, SOURCE_KEYS } from "@/components/charts/constants";
import { useState } from "react";
import { useMasking } from "@/contexts/masking-context";
import { useDisplayCurrency } from "@/contexts/display-currency-context";
import { formatCurrencyAmount } from "@/lib/fx-rates";
import type { Currency } from "@/lib/fx-rates";

interface AccountBreakdown {
  accountId: string;
  name: string;
  type: string;
  amount: number;
  owner: string;
}

interface DataDetailsPanelProps {
  clickedData: ClickedData;
  onClose: () => void;
}

export function DataDetailsPanel({
  clickedData,
  onClose,
}: DataDetailsPanelProps) {
  const { getChartCurrency } = useDisplayCurrency();
  const chartCurrency = getChartCurrency() as Currency;
  const { month, data, chartType } = clickedData;
  const { formatCurrency, isMasked } = useMasking();
  const [breakdownStates, setBreakdownStates] = useState<Map<string, boolean>>(
    new Map()
  );

  const toggleBreakdown = (source: string) => {
    setBreakdownStates((prev) => {
      const next = new Map(prev);
      next.set(source, !prev.get(source));
      return next;
    });
  };

  return (
    <div className="mt-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
      <div className="flex justify-between items-start mb-3 gap-2">
        <h4 className="font-medium text-base sm:text-lg truncate">{month} Details</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          ✕
        </Button>
      </div>

      {chartType === "total" && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Net Worth:</span>
            <span className="font-medium">
              £
              {data.netWorth !== undefined
                ? formatCurrency(data.netWorth)
                : "—"}
            </span>
          </div>
        </div>
      )}

      {chartType === "assets-vs-liabilities" && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Assets:</span>
            <span className="font-medium text-green-600">
              {typeof data.Assets === "number"
                ? formatCurrencyAmount(data.Assets, chartCurrency)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Liabilities:</span>
            <span className="font-medium text-red-600">
              {typeof data.Liabilities === "number"
                ? formatCurrencyAmount(data.Liabilities, chartCurrency)
                : "—"}
            </span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-medium">
              <span>Net Worth:</span>
              <span
                className={
                  typeof data["Net Worth"] === "number" &&
                  data["Net Worth"] >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {typeof data["Net Worth"] === "number"
                  ? formatCurrencyAmount(data["Net Worth"], chartCurrency)
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {chartType === "monthly-growth-rate" && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Growth Rate:</span>
            <span
              className={`font-medium ${
                typeof data["Growth Rate"] === "number" &&
                data["Growth Rate"] >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {typeof data["Growth Rate"] === "number"
                ? `${data["Growth Rate"] >= 0 ? "+" : ""}${data["Growth Rate"].toFixed(2)}%`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Net Worth:</span>
            <span className="font-medium">
              {typeof data.netWorth === "number"
                ? formatCurrencyAmount(data.netWorth, chartCurrency)
                : "—"}
            </span>
          </div>
        </div>
      )}

      {chartType === "allocation" && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Account Type Breakdown:
          </div>
          {Object.entries(data)
            .filter(
              ([key, value]) =>
                key !== "month" &&
                typeof value === "number" &&
                value > 0
            )
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([key, value], index) => {
              const total = Object.entries(data)
                .filter(
                  ([k, v]) =>
                    k !== "month" && typeof v === "number" && v > 0
                )
                .reduce((sum, [, v]) => sum + (v as number), 0);
              const percentage = total > 0 ? ((value as number) / total) * 100 : 0;
              return (
                <div key={key} className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="truncate text-sm sm:text-base">{key}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-medium text-sm sm:text-base">
                      {formatCurrencyAmount(value as number, chartCurrency)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {(chartType === "by-account" ||
        chartType === "by-account-type" ||
        chartType === "by-category") && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            {chartType === "by-account" && "Account Breakdown:"}
            {chartType === "by-account-type" && "Account Type Breakdown:"}
            {chartType === "by-category" && "Category Breakdown:"}
          </div>
          {Object.entries(data).map(([key, value], index) => {
            if (
              key !== "month" &&
              typeof value === "number" &&
              value > 0 &&
              !["x", "y", "width", "height", "value"].includes(key)
            ) {
              return (
                <div key={key} className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="truncate text-sm sm:text-base">{key}</span>
                  </div>
                  <span className="font-medium text-sm sm:text-base shrink-0">£{formatCurrency(value)}</span>
                </div>
              );
            }
            return null;
          })}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>
                £
                {formatCurrency(
                  Object.entries(data)
                    .filter(
                      ([key, value]) =>
                        key !== "month" &&
                        typeof value === "number" &&
                        value > 0 &&
                        !["x", "y", "width", "height", "value"].includes(key)
                    )
                    .reduce((sum, [, value]) => sum + (value as number), 0)
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {chartType === "by-wealth-source" && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Growth Sources:
          </div>
          {SOURCE_KEYS.map((source, index) => {
            const dataRecord = data as Record<
              string,
              number | string | { [key: string]: unknown } | undefined
            >;
            const rawValue = dataRecord[source];
            const value = typeof rawValue === "number" ? rawValue : undefined;
            const breakdown =
              typeof dataRecord.breakdown === "object" &&
              dataRecord.breakdown !== null
                ? (dataRecord.breakdown as Record<string, AccountBreakdown[]>)
                : {};
            const accounts = (breakdown[source] || []) as AccountBreakdown[];
            const showBreakdown = breakdownStates.get(source) || false;
            return (
              <div key={source} className="mb-2">
                <div className="flex justify-between items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="truncate text-sm sm:text-base">{source}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-medium text-sm sm:text-base ${
                        value !== undefined && value >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {value !== undefined ? (value >= 0 ? "+" : "-") : "—"}
                      {source === "Savings Rate"
                        ? isMasked
                          ? "•••"
                          : `${Math.round(Math.abs(value || 0))}%`
                        : isMasked
                        ? "••••••"
                        : value !== undefined
                        ? formatCurrencyAmount(Math.abs(value), chartCurrency)
                        : "—"}
                    </span>
                    {accounts.length > 0 && (
                      <button
                        className="text-xs text-primary underline hover:text-primary-focus focus:outline-none shrink-0"
                        onClick={() => toggleBreakdown(source)}
                        type="button"
                      >
                        {showBreakdown ? "See less" : "See more"}
                      </button>
                    )}
                  </div>
                </div>
                {showBreakdown && (
                  <ul className="ml-7 mt-1 space-y-0.5">
                    {accounts.map((acc) => (
                      <li
                        key={acc.accountId}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {acc.name} ({acc.owner}){" "}
                          <span className="text-xs">({acc.type})</span>
                        </span>
                        <span
                          className={
                            acc.amount >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {acc.amount >= 0 ? "+" : "-"}£
                          {formatCurrency(Math.abs(acc.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-medium">
              <span>Total Growth:</span>
              {(() => {
                const sfi =
                  typeof data["Savings from Income"] === "number"
                    ? data["Savings from Income"]
                    : 0;
                const ie =
                  typeof data["Interest Earned"] === "number"
                    ? data["Interest Earned"]
                    : 0;
                const cg =
                  typeof data["Capital Gains"] === "number"
                    ? data["Capital Gains"]
                    : 0;
                const total = sfi + ie + cg;
                return (
                  <span
                    className={total >= 0 ? "text-green-600" : "text-red-600"}
                  >
                    {total >= 0 ? "+" : "-"}£{formatCurrency(Math.abs(total))}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {chartType === "savings-rate" && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Savings Rate Details:
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Income:</span>
              <span className="font-medium">
                £
                {(() => {
                  const workIncome = data["Total Income"] || 0;
                  return formatCurrency(
                    typeof workIncome === "number" ? workIncome : Number(workIncome) || 0
                  );
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Savings:</span>
              <span className="font-medium text-green-600">
                £
                {(() => {
                  const breakdown =
                    (data.breakdown as unknown as Record<
                      string,
                      AccountBreakdown[]
                    >) || {};
                  const savings =
                    breakdown["Savings from Income"]?.reduce(
                      (sum, acc) => sum + acc.amount,
                      0
                    ) || 0;
                  return formatCurrency(Math.abs(savings));
                })()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Savings Rate:</span>
              <span className="font-medium text-green-600">
                {(() => {
                  const workIncome = Number(data["Total Income"]) || 0;
                  const savings = Number(data["Savings from Income"]) || 0;
                  return workIncome > 0
                    ? isMasked
                      ? "•••"
                      : `${Number(
                          ((Math.abs(savings) / workIncome) * 100).toFixed(1)
                        )}%`
                    : "0%";
                })()}
              </span>
            </div>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="text-sm text-muted-foreground mb-2">
              Account Breakdown:
            </div>
            <ul className="space-y-1">
              {(() => {
                const breakdown =
                  (data.breakdown as unknown as Record<
                    string,
                    AccountBreakdown[]
                  >) || {};
                return (
                  breakdown["Savings from Income"]?.map((acc) => (
                    <li
                      key={acc.accountId}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-muted-foreground">
                        {acc.name} ({acc.owner}){" "}
                        <span className="text-xs">({acc.type})</span>
                      </span>
                      <span
                        className={
                          acc.amount >= 0 ? "text-green-600" : "text-red-600"
                        }
                      >
                        {acc.amount >= 0 ? "+" : "-"}£
                        {formatCurrency(Math.abs(acc.amount))}
                      </span>
                    </li>
                  )) || []
                );
              })()}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
