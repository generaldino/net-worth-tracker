"use client";

import React from "react";
import { Card } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  subtitle?: React.ReactNode;
  controls?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  subtitle,
  controls,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <Card className={`p-4 sm:p-5 flex flex-col min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          {subtitle && <div className="mt-1 min-w-0">{subtitle}</div>}
        </div>
        {controls && (
          <div className="flex-shrink-0 flex items-center gap-2">{controls}</div>
        )}
      </div>
      <div className="flex-1 min-w-0 w-full">{children}</div>
    </Card>
  );
}
