"use client";

import { Button } from "@/components/ui/button";
import type { ClickedData } from "./types";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
];

interface DataDetailsPanelProps {
  clickedData: ClickedData;
  onClose: () => void;
}

export function DataDetailsPanel({
  clickedData,
  onClose,
}: DataDetailsPanelProps) {
  const { month, data, chartType } = clickedData;

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
              £{data.netWorth.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {chartType === "accounts" && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Account Breakdown:
          </div>
          {Object.entries(data).map(([accountName, value], index) => {
            if (
              accountName !== "month" &&
              typeof value === "number" &&
              value > 0
            ) {
              return (
                <div
                  key={accountName}
                  className="flex justify-between items-center"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span>{accountName}</span>
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
                  .reduce((sum, [_, value]) => sum + (value as number), 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {chartType === "sources" && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground mb-2">
            Growth Sources:
          </div>
          {["Savings from Income", "Interest Earned", "Capital Gains"].map(
            (source, index) => {
              const value = data[source];
              return (
                <div key={source} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span>{source}</span>
                  </div>
                  <span
                    className={`font-medium ${
                      value >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {value >= 0 ? "+" : ""}£{value.toLocaleString()}
                  </span>
                </div>
              );
            }
          )}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between font-medium">
              <span>Total Growth:</span>
              <span
                className={`${
                  data["Savings from Income"] +
                    data["Interest Earned"] +
                    data["Capital Gains"] >=
                  0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {data["Savings from Income"] +
                  data["Interest Earned"] +
                  data["Capital Gains"] >=
                0
                  ? "+"
                  : ""}
                £
                {(
                  data["Savings from Income"] +
                  data["Interest Earned"] +
                  data["Capital Gains"]
                ).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
