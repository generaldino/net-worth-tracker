"use client";

import { MaskingProvider } from "@/contexts/masking-context";

export function MaskingProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MaskingProvider>{children}</MaskingProvider>;
}

