"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface Props {
  name: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Isolates a chart card so a recharts regression or bad data shape on one
// chart doesn't blank the whole dashboard.
export class ChartErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`Chart error in ${this.props.name}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-5 flex items-center gap-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
          <span>
            Couldn&apos;t render the <strong>{this.props.name}</strong> chart.
          </span>
        </Card>
      );
    }
    return this.props.children;
  }
}
