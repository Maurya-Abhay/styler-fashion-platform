import { Metadata } from "next";
import { SiteHome } from "@/components/site-home";
import { WebsiteSchema, OrganizationSchema } from "@/components/structured-data";

import { SITE_URL } from "@/lib/site-url";
const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Styler — Find the perfect professional for your style",
  description: "Book trusted beauty, wellness and home services from verified professionals at your convenience. Hair, makeup, skincare, massage, home cleaning & more.",
  openGraph: {
    title: "Styler — Find the perfect professional for your style",
    description: "Book trusted beauty, wellness and home services from verified professionals at your convenience.",
    type: "website",
    url: BASE_URL,
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Styler — Find the perfect professional for your style",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Styler — Find the perfect professional for your style",
    description: "Book trusted beauty, wellness and home services from verified professionals at your convenience.",
    images: ["/og-image.svg"],
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export default function HomePage() {
  return (
    <>
      <WebsiteSchema />
      <OrganizationSchema />
      <SiteHome />
    </>
  );
}
