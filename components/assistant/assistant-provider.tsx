"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AssistantContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  canUseAssistant: boolean;
}

const AssistantContext = createContext<AssistantContextValue | undefined>(
  undefined,
);

interface AssistantProviderProps {
  children: ReactNode;
  /** Server-side-checked allowlist result, passed down from DashboardShell. */
  canUseAssistant: boolean;
}

export function AssistantProvider({
  children,
  canUseAssistant,
}: AssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    if (canUseAssistant) setIsOpen(true);
  }, [canUseAssistant]);

  const close = useCallback(() => setIsOpen(false), []);

  const toggle = useCallback(() => {
    if (canUseAssistant) setIsOpen((prev) => !prev);
  }, [canUseAssistant]);

  // Global ⌘J / Ctrl+J hotkey. Registered once at the provider level so any
  // page in the dashboard gets it. Early-returns if the user isn't allowlisted.
  useEffect(() => {
    if (!canUseAssistant) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canUseAssistant]);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle, canUseAssistant }),
    [isOpen, open, close, toggle, canUseAssistant],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    // Safe default so components unconditionally calling useAssistant() don't
    // throw when the provider is absent (e.g. on pages that don't include
    // the dashboard shell). The feature is simply inert.
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
      canUseAssistant: false,
    } satisfies AssistantContextValue;
  }
  return ctx;
}
