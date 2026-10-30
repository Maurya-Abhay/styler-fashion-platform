import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Verify the email address linked to your Styler account.",
  robots: { index: false, follow: true },
};

export default function VerifyEmailPage() {
  return <AuthForm mode="verify-email" />;
}
