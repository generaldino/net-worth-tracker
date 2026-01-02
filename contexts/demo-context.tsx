"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

const DEMO_MODE_KEY = "wealth-tracker-demo-mode";

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    const stored = localStorage.getItem(DEMO_MODE_KEY);
    if (stored === "true") {
      setIsDemoMode(true);
    }
    setIsHydrated(true);
  }, []);

  // Persist state changes to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(DEMO_MODE_KEY, isDemoMode.toString());
    }
  }, [isDemoMode, isHydrated]);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => !prev);
  }, []);

  const setDemoMode = useCallback((enabled: boolean) => {
    setIsDemoMode(enabled);
  }, []);

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}

