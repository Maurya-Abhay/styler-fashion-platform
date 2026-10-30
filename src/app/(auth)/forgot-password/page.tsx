import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a secure password reset code for your Styler account.",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot-password" />;
}
