"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from "react";
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

  const toggleMasking = useCallback(() => {
    setIsMasked((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isMasked === initialMasked) return;
    void setMaskingPreference(isMasked).catch(console.error);
  }, [isMasked, initialMasked]);

  const formatCurrency = useCallback((value: number): string => {
    if (isMasked) {
      return MASKED_VALUE;
    }
    return value.toLocaleString();
  }, [isMasked]);

  const value = useMemo(
    () => ({ isMasked, toggleMasking, formatCurrency }),
    [isMasked, toggleMasking, formatCurrency]
  );

  return (
    <MaskingContext.Provider value={value}>
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
