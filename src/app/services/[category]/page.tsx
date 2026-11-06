
import type { Metadata } from "next";
import { ServiceCategoryPage } from "@/components/public-services";
import {
  WebPageSchema,
  ServiceSchema,
} from "@/components/structured-data";
import { SITE_URL } from "@/lib/site-url";
import { getActiveServiceCategory } from "@/lib/service-categories";
import { notFound } from "next/navigation";

const BASE_URL = SITE_URL;

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { category } = await params;
  const categoryInfo = await getActiveServiceCategory(category);
  if (!categoryInfo) notFound();
  const label = categoryInfo.name;
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
  const categoryInfo = await getActiveServiceCategory(category);
  if (!categoryInfo) notFound();
  const label = categoryInfo.name;
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
      <ServiceCategoryPage
        category={category}
        categoryLabel={label}
        categoryImage={categoryInfo.image}
      />
    </>
  );
}
