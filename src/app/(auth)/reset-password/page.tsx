import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your Styler account.",
  robots: { index: false, follow: true },
};

export default function ResetPasswordPage() {
  return <AuthForm mode="reset-password" />;
}
