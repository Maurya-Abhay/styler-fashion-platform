import { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";
const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/about",
          "/professionals",
          "/services/",
          "/terms",
          "/privacy",
        ],
        disallow: [
          "/customer/",
          "/professional/",
          "/admin/",
          "/api/",
          "/_next/",
          "/static/",
        ],
      },
      {
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
      {
        userAgent: "ChatGPT-User",
        disallow: ["/"],
      },
      {
        userAgent: "anthropic-ai",
        disallow: ["/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
