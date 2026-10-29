
import type { Metadata } from "next";
import { ServiceCategoryPage } from "@/components/public-services";
import {
  WebPageSchema,
  ServiceSchema,
} from "@/components/structured-data";
import { SITE_URL } from "@/lib/site-url";
import { CATEGORIES } from "@/lib/categories";
import { notFound } from "next/navigation";

const BASE_URL = SITE_URL;

function getCategoryLabel(category: string) {
  return CATEGORIES.find((item) => item.slug === category)?.label
    || category.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params;
  if (!CATEGORIES.some((item) => item.slug === category)) notFound();
  const label = getCategoryLabel(category);
  const title = `${label} Services | Styler`;
  const description = `Find ${label.toLowerCase()} professionals near you. Explore designers, tailors and stylists on Styler.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/services/${category}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `${BASE_URL}/services/${category}`,
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: `${label} services on Styler`,
        },
      ],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { category } = await params;
  if (!CATEGORIES.some((item) => item.slug === category)) notFound();
  const label = getCategoryLabel(category);
  const url = `${BASE_URL}/services/${category}`;

  return (
    <>
      <WebPageSchema
        page={{
          name: `${label} Services`,
          description: `Find ${label.toLowerCase()} professionals on Styler.`,
          url,
          breadcrumb: [
            { name: "Home", url: BASE_URL },
            { name: "Services", url: `${BASE_URL}/services` },
            { name: label, url },
          ],
        }}
      />
      <ServiceCategoryPage category={category} />
    </>
  );
}
