
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfessionalDetail } from "@/components/public-discovery";
import { WebPageSchema } from "@/components/structured-data";
import { SITE_URL } from "@/lib/site-url";
import { getPublicProfessional } from "@/lib/public-professional";

const BASE_URL = SITE_URL.replace(/\/+$/, "");

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function readableSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\p{L}/gu, (character) => character.toUpperCase());
}

async function getProfile(slug: string) {
  try {
    return { data: await getPublicProfessional(slug), failed: false };
  } catch (error) {
    console.error("Could not load professional profile for public page.", { slug, error });
    return { data: null, failed: true };
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data, failed } = await getProfile(slug);
  const profile = data?.professional;

  if (!profile) {
    return {
      title: failed
        ? `${readableSlug(slug)} | Fashion Professional | Styler`
        : "Professional Not Found | Styler",
      description: failed
        ? `Discover ${readableSlug(slug)} on Styler. Explore fashion services, specialties and professional profiles.`
        : undefined,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  const name = profile.displayName?.trim() || readableSlug(slug);

  const description = (
    profile.bio?.trim() ||
    `Discover ${name} on Styler. Explore their fashion services, specialties and professional profile.`
  )
    .replace(/\s+/g, " ")
    .slice(0, 155);

  const canonicalSlug = profile.slug || slug;
  const canonicalUrl = `${BASE_URL}/professionals/${encodeURIComponent(
    canonicalSlug
  )}`;

  const imageUrl = profile.profilePhoto?.url || undefined;

  return {
    title: `${name} | Fashion Professional | Styler`,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: `${name} | Styler`,
      description,
      url: canonicalUrl,
      siteName: "Styler",
      type: "profile",
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                alt: `${name} profile photo`,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card: "summary_large_image",
      title: `${name} | Styler`,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default async function ProfessionalPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const { data, failed } = await getProfile(slug);

  if (!failed && !data?.professional) {
    notFound();
  }

  const profile = data?.professional;
  const name = profile?.displayName?.trim() || readableSlug(slug);
  const canonicalSlug = profile?.slug || slug;
  const canonicalUrl = `${BASE_URL}/professionals/${encodeURIComponent(
    canonicalSlug
  )}`;

  return (
    <>
      <WebPageSchema
        page={{
          name: `${name} | Fashion Professional`,
          description:
            profile?.bio?.trim() ||
            `Discover ${name}'s fashion profile and available services on Styler.`,
          url: canonicalUrl,
          breadcrumb: [
            {
              name: "Home",
              url: BASE_URL,
            },
            {
              name: "Professionals",
              url: `${BASE_URL}/professionals`,
            },
            {
              name,
              url: canonicalUrl,
            },
          ],
        }}
      />

      <main className="min-h-screen bg-background">
        <ProfessionalDetail slug={slug} />
      </main>
    </>
  );
}
