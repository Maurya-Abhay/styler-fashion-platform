/** Canonical public origin. Set NEXT_PUBLIC_APP_URL in production to the real HTTPS domain. */
const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
const fallbackUrl = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://styler.com";

export const SITE_URL = (configuredUrl || fallbackUrl).trim().replace(/\/+$/, "");
