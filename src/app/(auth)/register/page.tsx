import { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { WebPageSchema } from "@/components/structured-data";

import { SITE_URL } from "@/lib/site-url";
const BASE_URL = SITE_URL;

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Styler account to find trusted fashion professionals, book services, and manage appointments.",
  robots: { index: false, follow: true },
  openGraph: {
    title: "Create Account — Styler",
    description: "Join Styler to find fashion professionals and book services with confidence.",
    type: "website",
    url: `${BASE_URL}/register`,
  },
};

export default function RegisterPage() {
  return (
    <>
      <WebPageSchema
        page={{
          name: "Create Account",
          description: "Create your Styler account to find trusted fashion professionals.",
          url: `${BASE_URL}/register`,
        }}
      />
      <AuthForm mode="register" />
    </>
  );
}
