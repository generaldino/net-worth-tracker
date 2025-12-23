"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Currency } from "@/lib/fx-rates";
import type { AccountType } from "@/lib/types";

export interface ProjectionDataPoint {
  month: string;
  monthIndex: number;
  netWorth: number;
  accountBalances: Array<{
    accountId: string;
    accountName: string;
    accountType: AccountType;
    balance: number;
    currency: Currency;
  }>;
}

export interface ProjectionData {
  currentNetWorth: number;
  finalNetWorth: number;
  totalGrowth: number;
  growthPercentage: number;
  projectionData: ProjectionDataPoint[];
}

interface ProjectionContextType {
  projectionData: ProjectionData | null;
  setProjectionData: (data: ProjectionData | null) => void;
  selectedScenarioId: string | null;
  setSelectedScenarioId: (id: string | null) => void;
}

const ProjectionContext = createContext<ProjectionContextType | undefined>(
  undefined
);

export function ProjectionProvider({ children }: { children: ReactNode }) {
  const [projectionData, setProjectionData] = useState<ProjectionData | null>(
    null
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null
  );

  return (
    <ProjectionContext.Provider
      value={{
        projectionData,
        setProjectionData,
        selectedScenarioId,
        setSelectedScenarioId,
      }}
    >
      {children}
    </ProjectionContext.Provider>
  );
}

export function useProjection() {
  const context = useContext(ProjectionContext);
  if (context === undefined) {
    throw new Error("useProjection must be used within a ProjectionProvider");
  }
  return context;
}

