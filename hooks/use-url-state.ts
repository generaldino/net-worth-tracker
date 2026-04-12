"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

// Shallow URL state — updates window.history directly without triggering
// a Next.js RSC round-trip. Multiple components using the same key stay in
// sync through a module-level listener set.
type Listener = (value: string) => void;
const listeners = new Map<string, Set<Listener>>();

function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
  };
}

function notify(key: string, value: string): void {
  listeners.get(key)?.forEach((l) => l(value));
}

export function useUrlState<T extends string>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const searchParams = useSearchParams();
  const [value, setValueState] = useState<T>(
    () => (searchParams.get(key) as T) ?? defaultValue
  );

  useEffect(() => {
    // Sync with live URL on mount (may differ from searchParams after
    // shallow updates from other instances).
    const params = new URLSearchParams(window.location.search);
    const current = (params.get(key) as T) ?? defaultValue;
    setValueState(current);

    const unsubscribe = subscribe(key, (next) => setValueState(next as T));

    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      setValueState((p.get(key) as T) ?? defaultValue);
    };
    window.addEventListener("popstate", onPop);

    return () => {
      unsubscribe();
      window.removeEventListener("popstate", onPop);
    };
  }, [key, defaultValue]);

  const setValue = useCallback(
    (newValue: T) => {
      const params = new URLSearchParams(window.location.search);
      if (newValue === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }
      const queryString = params.toString();
      const newUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
      setValueState(newValue);
      notify(key, newValue);
    },
    [key, defaultValue]
  );

  return [value, setValue];
}
