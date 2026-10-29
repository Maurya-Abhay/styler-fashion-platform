import { Metadata } from "next";
import { AboutContent } from "@/components/about-content";
import { WebPageSchema } from "@/components/structured-data";

import { SITE_URL } from "@/lib/site-url";
const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "About Styler",
  description: "Learn about Styler's mission to make beauty, wellness and home services simple. Meet our team, our values, and how professionals use Styler.",
  openGraph: {
    title: "About Styler — Our Mission & Values",
    description: "Learn about Styler's mission to make beauty, wellness and home services simple. Meet our team, our values, and how professionals use Styler.",
    type: "website",
    url: `${BASE_URL}/about`,
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "About Styler — Fashion made personal",
      },
    ],
  },
  alternates: {
    canonical: `${BASE_URL}/about`,
  },
};

export default function AboutPage() {
  return (
    <>
      <WebPageSchema
        page={{
          name: "About Styler",
          description: "Learn about Styler's mission to make beauty, wellness and home services simple.",
          url: `${BASE_URL}/about`,
          breadcrumb: [
            { name: "Home", url: BASE_URL },
            { name: "About", url: `${BASE_URL}/about` },
          ],
        }}
      />
      <AboutContent />
    </>
  );
}
