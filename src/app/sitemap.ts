import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";
import { connectDB } from "@/lib/db";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { listServiceCategories } from "@/lib/service-categories";

const BASE_URL = SITE_URL;

export const dynamic = "force-dynamic";
const publicRoutes = [
  "", "/about", "/professionals",
  "/terms", "/privacy",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const publicUrls: MetadataRoute.Sitemap = publicRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : route === "/professionals" ? 0.9 : route === "/about" ? 0.7 : 0.6,
  }));

  try {
    const categories = await listServiceCategories();
    for (const category of categories) {
      publicUrls.push({
        url: `${BASE_URL}/services/${encodeURIComponent(category.slug)}`,
        lastModified: category.updatedAt || now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (error) {
    console.error("Unable to include service categories in sitemap", error instanceof Error ? error.message : "Unknown error");
  }

  try {
    await connectDB();
    const profiles = await ProfessionalProfile.find({ applicationStatus: "approved", slug: { $type: "string", $ne: "" } })
      .select("slug updatedAt createdAt").sort({ updatedAt: -1 }).limit(5000).lean();
    for (const profile of profiles as any[]) {
      publicUrls.push({
        url: `${BASE_URL}/professionals/${encodeURIComponent(profile.slug)}`,
        lastModified: profile.updatedAt || profile.createdAt || now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    // Keep the static public sitemap available if the database is temporarily unavailable.
    console.error("Unable to include professional profiles in sitemap", error instanceof Error ? error.message : "Unknown error");
  }
  return publicUrls;
}
