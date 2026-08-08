import { getAccounts, getCurrentValue, getAccountHistory } from "@/lib/actions";
import { AccountsAdmin } from "./accounts-admin";

export async function NewAccountsSectionWrapper() {
  const accounts = await getAccounts(true); // Include closed accounts

  const accountData = await Promise.all(
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
  );

  const currentValues = Object.fromEntries(
    accountData.map(({ accountId, currentValue }) => [accountId, currentValue])
  );

  const accountHistories = Object.fromEntries(
    accountData.map(({ accountId, history }) => [accountId, history])
  );

  return (
    <AccountsAdmin
      accounts={accounts}
      accountHistories={accountHistories}
      currentValues={currentValues}
    />
  );
}
