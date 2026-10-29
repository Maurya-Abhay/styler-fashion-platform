"use client";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal-shell";
export function AdminPortalShell({ children }: { children: ReactNode }) {
  return <PortalShell role="admin">{children}</PortalShell>;
}
