"use client";

import { useMemo } from "react";
import { NewAccountsSection } from "@/components/new-accounts-section";
import {
  demoAccounts,
  getDemoAccountHistories,
  getDemoCurrentValues,
} from "@/lib/demo-data";

export function DemoAccountsSection() {
  const accountHistories = useMemo(() => getDemoAccountHistories(), []);
  const currentValues = useMemo(() => getDemoCurrentValues(), []);

  return (
    <NewAccountsSection
      accounts={demoAccounts}
      accountHistories={accountHistories}
      currentValues={currentValues}
      isDemo={true}
    />
  );
}

