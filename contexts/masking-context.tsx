"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { setMaskingPreference } from "@/lib/preferences";

interface MaskingContextType {
  isMasked: boolean;
  toggleMasking: () => void;
  formatCurrency: (value: number) => string;
}

const MaskingContext = createContext<MaskingContextType | undefined>(undefined);

const MASKED_VALUE = "••••••";

interface MaskingProviderProps {
  children: ReactNode;
  initialMasked?: boolean; // Passed from server component via cookies
}

export function MaskingProvider({ children, initialMasked = true }: MaskingProviderProps) {
  const [isMasked, setIsMasked] = useState(initialMasked);

  // Toggle masking - update state immediately (optimistic) and persist to cookie
  const toggleMasking = useCallback(() => {
    setIsMasked((prev) => {
      const newValue = !prev;
      // Fire and forget - persist to cookie via server action
      setMaskingPreference(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  const formatCurrency = useCallback((value: number): string => {
    if (isMasked) {
      return MASKED_VALUE;
    }
    return value.toLocaleString();
  }, [isMasked]);

  return (
    <MaskingContext.Provider value={{ isMasked, toggleMasking, formatCurrency }}>
      {children}
    </MaskingContext.Provider>
  );
}

export function useMasking() {
  const context = useContext(MaskingContext);
  if (context === undefined) {
    throw new Error("useMasking must be used within a MaskingProvider");
  }
  return context;
}
