"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { setDemoModePreference } from "@/lib/preferences";

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (enabled: boolean) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

interface DemoProviderProps {
  children: ReactNode;
  initialDemoMode?: boolean; // Passed from server component via cookies
}

export function DemoProvider({ children, initialDemoMode = false }: DemoProviderProps) {
  // Initialize with server-provided value (no useEffect needed!)
  const [isDemoMode, setIsDemoMode] = useState(initialDemoMode);

  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const newValue = !prev;
      // Fire and forget - persist to cookie via server action
      setDemoModePreference(newValue).catch(console.error);
      return newValue;
    });
  }, []);

  const setDemoMode = useCallback((enabled: boolean) => {
    setIsDemoMode(enabled);
    // Fire and forget - persist to cookie via server action
    setDemoModePreference(enabled).catch(console.error);
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
