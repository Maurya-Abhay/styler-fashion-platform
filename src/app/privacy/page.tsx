import { Metadata } from "next";
import { LegalPageClient } from "@/components/legal-page-client";
import { WebPageSchema } from "@/components/structured-data";

import { SITE_URL } from "@/lib/site-url";
const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn what information Styler uses, how it supports accounts and bookings, and how to contact us about your data.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Privacy Policy — Styler",
    description: "How Styler uses account, profile and booking information.",
    type: "website",
    url: `${BASE_URL}/privacy`,
  },
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return (
    <>
      <WebPageSchema
        page={{
          name: "Privacy Policy",
          description: "How Styler handles your account and booking information.",
          url: `${BASE_URL}/privacy`,
          breadcrumb: [
            { name: "Home", url: BASE_URL },
            { name: "Privacy", url: `${BASE_URL}/privacy` },
          ],
        }}
      />
      <LegalPageClient kind="privacy" />
    </>
  );
}
