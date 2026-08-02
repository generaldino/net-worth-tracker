"use client";

import { useCallback, useMemo } from "react";
import { useUrlState } from "@/hooks/use-url-state";

// Multi-value URL state on top of `useUrlState`. Values are stored as a
// comma-separated list with each entry percent-encoded, so owner names
// containing a comma survive the round-trip. An empty list removes the
// param entirely.
export function useUrlListState(
  key: string
): [string[], (values: string[]) => void] {
  const [raw, setRaw] = useUrlState<string>(key, "");

  const values = useMemo(
    () =>
      raw
        ? raw
            .split(",")
            .filter(Boolean)
            .map((v) => {
              try {
                return decodeURIComponent(v);
              } catch {
                return v;
              }
            })
        : [],
    [raw]
  );

  const setValues = useCallback(
    (next: string[]) => {
      const unique = Array.from(new Set(next.filter(Boolean)));
      setRaw(unique.map((v) => encodeURIComponent(v)).join(","));
    },
    [setRaw]
  );

  return [values, setValues];
}
