"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface MaskingContextType {
  isMasked: boolean;
  toggleMasking: () => void;
  formatCurrency: (value: number) => string;
}

const MaskingContext = createContext<MaskingContextType | undefined>(undefined);

const MASKED_VALUE = "••••••";

export function MaskingProvider({ children }: { children: ReactNode }) {
  const [isMasked, setIsMasked] = useState(true);

  // Load masking preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("valueMasking");
    if (saved !== null) {
      setIsMasked(saved === "true");
    }
  }, []);

  // Save masking preference to localStorage
  const toggleMasking = () => {
    setIsMasked((prev) => {
      const newValue = !prev;
      localStorage.setItem("valueMasking", String(newValue));
      return newValue;
    });
  };

  const formatCurrency = (value: number): string => {
    if (isMasked) {
      return MASKED_VALUE;
    }
    return value.toLocaleString();
  };

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

