import {
  getAccounts,
  getCurrentValue,
  getAccountHistory,
  getStaleAccounts,
} from "@/lib/actions";
import { NewAccountsSection } from "./new-accounts-section";

export async function NewAccountsSectionWrapper() {
  const accounts = await getAccounts(true); // Include closed accounts

  // Fetch all account data and stale accounts in parallel
  const [accountData, staleAccountsData] = await Promise.all([
    Promise.all(
      accounts.map(async (account) => {
        const [currentValue, history] = await Promise.all([
          getCurrentValue(account.id),
          getAccountHistory(account.id),
        ]);

        return {
          accountId: account.id,
          currentValue,
          history,
        };
      })
    ),
    getStaleAccounts(),
  ]);

  // Transform the data into the format expected by NewAccountsSection
  const currentValues = Object.fromEntries(
    accountData.map(({ accountId, currentValue }) => [accountId, currentValue])
  );

  const accountHistories = Object.fromEntries(
    accountData.map(({ accountId, history }) => [accountId, history])
  );

  return (
    <NewAccountsSection
      accounts={accounts}
      accountHistories={accountHistories}
      currentValues={currentValues}
      staleAccountsData={staleAccountsData}
    />
  );
}

