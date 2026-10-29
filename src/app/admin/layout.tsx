import type { Metadata } from "next";
import { AdminPortalShell } from "@/components/admin-portal-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPortalShell>{children}</AdminPortalShell>;
}