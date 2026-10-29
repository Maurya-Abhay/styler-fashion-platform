import { SITE_URL } from "@/lib/site-url";
import type { ReactNode } from "react";

interface StructuredDataProps {
  data: Record<string, unknown>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function WebsiteSchema() {
  const BASE_URL = SITE_URL;
  
  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Styler",
        url: BASE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/professionals?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function OrganizationSchema() {
  const BASE_URL = SITE_URL;
  
  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Styler",
        url: BASE_URL,
        logo: `${BASE_URL}/styler-icon.svg`,
        sameAs: [
          "https://twitter.com/stylerapp",
          "https://instagram.com/stylerapp",
          "https://linkedin.com/company/styler",
        ],
        ...(process.env.NEXT_PUBLIC_SUPPORT_EMAIL ? { contactPoint: {
          "@type": "ContactPoint",
          email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
          contactType: "customer service",
          availableLanguage: ["English", "Hindi"],
        } } : {}),
      }}
    />
  );
}

export function ProfessionalSchema(professional: {
  name: string;
  description: string;
  url: string;
  image?: string;
  address: {
    streetAddress?: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  priceRange?: string;
  telephone?: string;
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  services?: Array<{
    name: string;
    description: string;
    price?: string;
  }>;
}) {
  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: professional.name,
        description: professional.description,
        url: professional.url,
        image: professional.image,
        address: {
          "@type": "PostalAddress",
          ...professional.address,
        },
        priceRange: professional.priceRange,
        telephone: professional.telephone,
        aggregateRating: professional.aggregateRating
          ? {
              "@type": "AggregateRating",
              ratingValue: professional.aggregateRating.ratingValue,
              reviewCount: professional.aggregateRating.reviewCount,
            }
          : undefined,
        hasOfferCatalog: professional.services
          ? {
              "@type": "OfferCatalog",
              name: "Services",
              itemListElement: professional.services.map((service, index) => ({
                "@type": "Offer",
                position: index + 1,
                itemOffered: {
                  "@type": "Service",
                  name: service.name,
                  description: service.description,
                },
                price: service.price,
                priceCurrency: "INR",
              })),
            }
          : undefined,
      }}
    />
  );
}

export function ServiceSchema(service: {
  name: string;
  description: string;
  provider: {
    name: string;
    url: string;
  };
  category: string;
  price?: string;
  priceCurrency?: string;
  availability?: string;
  areaServed?: {
    "@type": "City" | "State";
    name: string;
  }[];
}) {
  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@type": "Service",
        name: service.name,
        description: service.description,
        provider: {
          "@type": "LocalBusiness",
          name: service.provider.name,
          url: service.provider.url,
        },
        category: service.category,
        offers: service.price
          ? {
              "@type": "Offer",
              price: service.price,
              priceCurrency: service.priceCurrency || "INR",
              availability: service.availability || "https://schema.org/InStock",
            }
          : undefined,
        areaServed: service.areaServed,
      }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function FAQSchema(faqs: Array<{ question: string; answer: string }>) {
  if (!Array.isArray(faqs) || faqs.length === 0) {
    return null;
  }

  return (
    <StructuredData
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }}
    />
  );
}

export function WebPageSchema({ page }: { page: {
  name: string;
  description: string;
  url: string;
  breadcrumb?: Array<{ name: string; url: string }>;
} }) {
  const breadcrumbItems = Array.isArray(page.breadcrumb) ? page.breadcrumb : [];

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.name,
          description: page.description,
          url: page.url,
          ...(breadcrumbItems.length > 0 && {
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: breadcrumbItems.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                name: item.name,
                item: item.url,
              })),
            },
          }),
        }}
      />
      {breadcrumbItems.length > 0 && <BreadcrumbSchema items={breadcrumbItems} />}
    </>
  );
}
