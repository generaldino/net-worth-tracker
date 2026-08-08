"use client";

import { useMemo } from "react";
import { AccountsAdmin } from "@/components/accounts-admin";
import {
  demoAccounts,
  getDemoAccountHistories,
  getDemoCurrentValues,
} from "@/lib/demo-data";

export function DemoAccountsSection() {
  const accountHistories = useMemo(() => getDemoAccountHistories(), []);
  const currentValues = useMemo(() => getDemoCurrentValues(), []);

  return (
    <AccountsAdmin
      accounts={demoAccounts}
      accountHistories={accountHistories}
      currentValues={currentValues}
      isDemo={true}
    />
  );
}
