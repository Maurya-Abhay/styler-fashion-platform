import type { Metadata } from "next";
import { ProfessionalPortalShell } from "@/components/professional-portal-shell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  return <ProfessionalPortalShell>{children}</ProfessionalPortalShell>;
}