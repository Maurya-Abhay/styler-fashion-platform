"use client";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal-shell";
export function ProfessionalPortalShell({ children }: { children: ReactNode }) {
  return <PortalShell role="professional">{children}</PortalShell>;
}
