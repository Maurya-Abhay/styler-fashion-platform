import { Metadata } from "next";
import { LegalPageClient } from "@/components/legal-page-client";
import { WebPageSchema } from "@/components/structured-data";

import { SITE_URL } from "@/lib/site-url";
const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Styler Terms of Use — Important conditions for using the Styler service marketplace connecting customers with fashion professionals.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms of Use — Styler",
    description: "Styler Terms of Use for customers and professionals.",
    type: "website",
    url: `${BASE_URL}/terms`,
  },
  alternates: {
    canonical: `${BASE_URL}/terms`,
  },
};

export default function TermsPage() {
  return (
    <>
      <WebPageSchema
        page={{
          name: "Terms of Use",
          description: "Styler Terms of Use — Important conditions for using the Styler service marketplace.",
          url: `${BASE_URL}/terms`,
          breadcrumb: [
            { name: "Home", url: BASE_URL },
            { name: "Terms", url: `${BASE_URL}/terms` },
          ],
        }}
      />
      <LegalPageClient kind="terms" />
    </>
  );
}
