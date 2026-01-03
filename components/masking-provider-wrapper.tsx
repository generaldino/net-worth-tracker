"use client";

import { MaskingProvider } from "@/contexts/masking-context";

interface MaskingProviderWrapperProps {
  children: React.ReactNode;
  initialMasked?: boolean;
}

export function MaskingProviderWrapper({
  children,
  initialMasked,
}: MaskingProviderWrapperProps) {
  return <MaskingProvider initialMasked={initialMasked}>{children}</MaskingProvider>;
}
