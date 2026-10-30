import { Metadata } from "next";
import { LegalPageClient } from "@/components/legal-page-client";
import { WebPageSchema } from "@/components/structured-data";

import { SITE_URL } from "@/lib/site-url";
const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the practical terms for using Styler, requesting services, managing bookings, payments and marketplace accounts.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Terms & Conditions — Styler",
    description: "The terms for customers and professionals using Styler.",
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
          name: "Terms & Conditions",
          description: "The terms for customers and professionals using Styler.",
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
