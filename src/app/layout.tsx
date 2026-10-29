
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { SITE_URL } from "@/lib/site-url";

import "./globals.css";

const BASE_URL = SITE_URL;
const SITE_NAME = "Styler";

const DEFAULT_TITLE =
  "Styler — Find the perfect professional for your style";

const DEFAULT_DESCRIPTION =
  "Book trusted beauty, wellness and home services from verified professionals at your convenience.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },

  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,

  keywords: [
    "beauty professionals",
    "home services",
    "salon at home",
    "tailors",
    "designers",
    "stylists",
    "lehenga stitching",
    "custom clothing",
    "alterations",
    "personal styling",
    "fashion consulting",
    "wedding outfits",
    "book tailor online",
    "find seamstress",
    "fashion marketplace",
    "verified professionals",
  ],

  authors: [{ name: "Styler Team" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: BASE_URL,
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BASE_URL,
    siteName: SITE_NAME,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: DEFAULT_TITLE,
        type: "image/svg+xml",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image.svg"],
    creator: "@stylerapp",
    site: "@stylerapp",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/styler-icon.svg",
    shortcut: "/styler-icon.svg",
  },

  manifest: "/site.webmanifest",

  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? {
          google: process.env.GOOGLE_SITE_VERIFICATION,
        }
      : {}),

    other: {
      ...(process.env.FACEBOOK_DOMAIN_VERIFICATION
        ? {
            "facebook-domain-verification":
              process.env.FACEBOOK_DOMAIN_VERIFICATION,
          }
        : {}),
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6b1d5c",
  maximumScale: 5,
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem("styler-theme");

    if (theme !== "dark" && theme !== "light") {
      theme =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }

    var root = document.documentElement;

    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  } catch (error) {
    // Theme initialization is optional if browser storage is unavailable.
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="dns-prefetch"
          href="https://ik.imagekit.io"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>

      <body className="bg-styler-canvas font-sans text-styler-ink antialiased selection:bg-styler-accent-soft selection:text-styler-ink">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
