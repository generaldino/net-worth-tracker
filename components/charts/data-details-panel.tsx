"use client";

import { Button } from "@/components/ui/button";
import type { ClickedData } from "@/components/charts/types";
import { COLORS, SOURCE_KEYS } from "@/components/charts/constants";
import { useState } from "react";

interface AccountBreakdown {
  accountId: string;
  name: string;
  type: string;
  amount: number;
}

interface DataDetailsPanelProps {
  clickedData: ClickedData;
  onClose: () => void;
}

export function DataDetailsPanel({
  clickedData,
  onClose,
}: DataDetailsPanelProps) {
  const { month, data, chartType } = clickedData;
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
    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-medium text-lg">{month} Details</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
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
                ? data.netWorth.toLocaleString()
                : "—"}
            </span>
          </div>
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
            if (key !== "month" && typeof value === "number" && value > 0) {
              return (
                <div key={key} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span>{key}</span>
                  </div>
                  <span className="font-medium">£{value.toLocaleString()}</span>
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
                {Object.entries(data)
                  .filter(
                    ([key, value]) =>
                      key !== "month" && typeof value === "number"
                  )
                  .reduce((sum, [, value]) => sum + (value as number), 0)
                  .toLocaleString()}
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
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span>{source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-medium ${
                        value !== undefined && value >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {value !== undefined ? (value >= 0 ? "+" : "-") : "—"}£
                      {value !== undefined
                        ? Math.abs(value).toLocaleString()
                        : "—"}
                    </span>
                    {accounts.length > 0 && (
                      <button
                        className="text-xs text-primary underline hover:text-primary-focus focus:outline-none"
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
                          {acc.name}{" "}
                          <span className="text-xs">({acc.type})</span>
                        </span>
                        <span
                          className={
                            acc.amount >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          {acc.amount >= 0 ? "+" : "-"}£
                          {Math.abs(acc.amount).toLocaleString()}
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
                    {total >= 0 ? "+" : "-"}£{Math.abs(total).toLocaleString()}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
