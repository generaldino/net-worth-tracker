"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Custom hook for managing state in URL search params
 * Provides SSR-friendly state that persists in the URL
 */
export function useUrlState<T extends string>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current value from URL or use default
  const value = (searchParams.get(key) as T) ?? defaultValue;

  // Update URL when value changes
  const setValue = useCallback(
    (newValue: T) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (newValue === defaultValue) {
        // Remove param if it's the default value (cleaner URLs)
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      
      // Use replace to avoid cluttering browser history with every filter change
      router.replace(newUrl, { scroll: false });
    },
    [key, defaultValue, pathname, searchParams, router]
  );

  return [value, setValue];
}
