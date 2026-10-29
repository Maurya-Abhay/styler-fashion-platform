
import type { Metadata } from "next";
import { ProfessionalDiscovery } from "@/components/public-discovery";
import { WebPageSchema } from "@/components/structured-data";
import { SITE_URL } from "@/lib/site-url";

const BASE_URL = SITE_URL.replace(/\/+$/, "");
const PAGE_URL = `${BASE_URL}/professionals`;

export const metadata: Metadata = {
  title: "Find Fashion Professionals | Styler",
  description:
    "Discover fashion professionals on Styler. Explore tailors, designers and stylists by service, location and specialty.",
  alternates: {
    canonical: PAGE_URL,
  },
  openGraph: {
    title: "Find Fashion Professionals | Styler",
    description:
      "Explore fashion professionals, compare services and find the right fit for your style.",
    url: PAGE_URL,
    siteName: "Styler",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og-image.svg`,
        width: 1200,
        height: 630,
        alt: "Discover fashion professionals on Styler",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Fashion Professionals | Styler",
    description:
      "Discover tailors, designers and stylists for your next fashion project.",
    images: [`${BASE_URL}/og-image.svg`],
  },
};

export default function ProfessionalsPage() {
  return (
    <>
      <main className="min-h-screen bg-background">
        <ProfessionalDiscovery />
      </main>
    </>
  );
}
