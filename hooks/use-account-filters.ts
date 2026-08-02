"use client";

import { useCallback, useMemo } from "react";
import { useUrlListState } from "@/hooks/use-url-list-state";
import {
  countActiveFilters,
  FILTER_PARAM,
  type AccountFilterState,
  type FilterFacetKey,
} from "@/lib/account-filters";

export interface AccountFiltersApi {
  filters: AccountFilterState;
  activeCount: number;
  setFacet: (key: FilterFacetKey, values: string[]) => void;
  toggle: (key: FilterFacetKey, value: string) => void;
  clearFacet: (key: FilterFacetKey) => void;
  clearAll: () => void;
}

// Single source of truth for the account filters. Every instance reads the
// same URL params, so the navbar control and the accounts toolbar control
// stay in sync without any shared React state.
export function useAccountFilters(): AccountFiltersApi {
  const [owners, setOwners] = useUrlListState(FILTER_PARAM.owners);
  const [types, setTypes] = useUrlListState(FILTER_PARAM.types);
  const [categories, setCategories] = useUrlListState(FILTER_PARAM.categories);
  const [currencies, setCurrencies] = useUrlListState(FILTER_PARAM.currencies);
  const [accounts, setAccounts] = useUrlListState(FILTER_PARAM.accounts);

  const filters = useMemo<AccountFilterState>(
    () => ({ owners, types, categories, currencies, accounts }),
    [owners, types, categories, currencies, accounts]
  );

  const setters = useMemo<
    Record<FilterFacetKey, (values: string[]) => void>
  >(
    () => ({
      owners: setOwners,
      types: setTypes,
      categories: setCategories,
      currencies: setCurrencies,
      accounts: setAccounts,
    }),
    [setOwners, setTypes, setCategories, setCurrencies, setAccounts]
  );

  const setFacet = useCallback(
    (key: FilterFacetKey, values: string[]) => setters[key](values),
    [setters]
  );

  const toggle = useCallback(
    (key: FilterFacetKey, value: string) => {
      const current = filters[key];
      setters[key](
        current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value]
      );
    },
    [filters, setters]
  );

  const clearFacet = useCallback(
    (key: FilterFacetKey) => setters[key]([]),
    [setters]
  );

  const clearAll = useCallback(() => {
    setOwners([]);
    setTypes([]);
    setCategories([]);
    setCurrencies([]);
    setAccounts([]);
  }, [setOwners, setTypes, setCategories, setCurrencies, setAccounts]);

  return {
    filters,
    activeCount: countActiveFilters(filters),
    setFacet,
    toggle,
    clearFacet,
    clearAll,
  };
}
