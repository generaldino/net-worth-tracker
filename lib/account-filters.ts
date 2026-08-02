// Shared account filter vocabulary used by both the navbar (which filters the
// charts and KPIs) and the accounts toolbar (which filters the account list).
// Both surfaces read and write the same URL params, so a filtered view is
// shareable, survives a refresh, and stays consistent across pages.

export const FILTER_FACET_KEYS = [
  "owners",
  "types",
  "categories",
  "currencies",
  "accounts",
] as const;

export type FilterFacetKey = (typeof FILTER_FACET_KEYS)[number];

export type AccountFilterState = Record<FilterFacetKey, string[]>;

export const EMPTY_FILTER_STATE: AccountFilterState = {
  owners: [],
  types: [],
  categories: [],
  currencies: [],
  accounts: [],
};

// URL param name per facet. Kept identical to the facet key for readability
// of the resulting URL (`?types=Pension&owners=Danny`).
export const FILTER_PARAM: Record<FilterFacetKey, string> = {
  owners: "owners",
  types: "types",
  categories: "categories",
  currencies: "currencies",
  accounts: "accounts",
};

export const FACET_LABEL: Record<FilterFacetKey, string> = {
  owners: "Owner",
  types: "Account Type",
  categories: "Category",
  currencies: "Currency",
  accounts: "Account",
};

export interface FilterableAccount {
  id: string;
  name: string;
  type: string;
  owner: string;
  category?: string | null;
  currency?: string | null;
}

// Inclusion semantics: an empty facet means "no constraint", so no selection
// anywhere shows everything. Facets combine with AND, values within a facet
// with OR.
export function accountMatchesFilters(
  account: FilterableAccount,
  filters: AccountFilterState
): boolean {
  if (filters.owners.length > 0 && !filters.owners.includes(account.owner))
    return false;
  if (filters.types.length > 0 && !filters.types.includes(account.type))
    return false;
  if (
    filters.categories.length > 0 &&
    !filters.categories.includes(account.category ?? "")
  )
    return false;
  if (
    filters.currencies.length > 0 &&
    !filters.currencies.includes(account.currency ?? "")
  )
    return false;
  if (filters.accounts.length > 0 && !filters.accounts.includes(account.id))
    return false;
  return true;
}

export function countActiveFilters(filters: AccountFilterState): number {
  return FILTER_FACET_KEYS.reduce(
    (total, key) => total + filters[key].length,
    0
  );
}

export function formatFilterValue(key: FilterFacetKey, value: string): string {
  return key === "types" ? value.replace(/_/g, " ") : value;
}
