import { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { WebPageSchema } from "@/components/structured-data";
import { SITE_URL } from "@/lib/site-url";

const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Styler account to manage bookings, discover professionals, and track your style journey.",
  robots: { index: false, follow: true },
  alternates: {
    canonical: `${BASE_URL}/login`,
  },
  openGraph: {
    title: "Sign In — Styler",
    description:
      "Sign in to manage your appointments and discover fashion professionals.",
    type: "website",
    url: `${BASE_URL}/login`,
  },
};

export default function LoginPage() {
  return (
    <>
      <WebPageSchema
        page={{
          name: "Sign In",
          description: "Sign in to your Styler account.",
          url: `${BASE_URL}/login`,
        }}
      />
      <AuthForm mode="login" />
    </>
  );
}