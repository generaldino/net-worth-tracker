import {
  FACET_LABEL,
  formatFilterValue,
  type FilterableAccount,
} from "@/lib/account-filters";
import type { FilterFacetConfig } from "./account-filters-popover";

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort(
    (a, b) => a.localeCompare(b)
  );
}

// Derives the facet options from whatever accounts the surface knows about,
// so the navbar and the accounts toolbar offer the same choices without
// hardcoding enum lists. Facets with fewer than two options are dropped —
// a filter that can only select everything is noise.
export function buildAccountFacets(
  accounts: FilterableAccount[]
): FilterFacetConfig[] {
  const facets: FilterFacetConfig[] = [
    {
      key: "types",
      label: FACET_LABEL.types,
      options: uniqueSorted(accounts.map((a) => a.type)).map((value) => ({
        value,
        label: formatFilterValue("types", value),
      })),
    },
    {
      key: "categories",
      label: FACET_LABEL.categories,
      options: uniqueSorted(accounts.map((a) => a.category)).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "currencies",
      label: FACET_LABEL.currencies,
      options: uniqueSorted(accounts.map((a) => a.currency)).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "owners",
      label: FACET_LABEL.owners,
      options: uniqueSorted(accounts.map((a) => a.owner)).map((value) => ({
        value,
        label: value,
      })),
    },
    {
      key: "accounts",
      label: "Accounts",
      searchable: true,
      options: [...accounts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({ value: a.id, label: a.name })),
    },
  ];

  return facets.filter((facet) => facet.options.length > 1);
}
