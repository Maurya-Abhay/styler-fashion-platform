
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { apiRequest } from "@/components/api-client";
import { Alert, Button, Field } from "@/components/ui";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type Mode =
  | "login"
  | "register"
  | "verify-email"
  | "forgot-password"
  | "reset-password";

const copy: Record<
  Mode,
  { eyebrow: string; title: string; description: string }
> = {
  login: {
    eyebrow: "WELCOME BACK",
    title: "Good to see you again.",
    description: "Your next great look starts with the right people.",
  },
  register: {
    eyebrow: "JOIN STYLER",
    title: "Make style personal.",
    description: "Discover fashion talent or grow your own professional journey.",
  },
  "verify-email": {
    eyebrow: "EMAIL VERIFICATION",
    title: "Almost there.",
    description: "Enter the verification code sent to your email.",
  },
  "forgot-password": {
    eyebrow: "ACCOUNT RECOVERY",
    title: "Let's get you back in.",
    description: "We'll send a reset code to your registered email address.",
  },
  "reset-password": {
    eyebrow: "NEW PASSWORD",
    title: "A fresh start.",
    description: "Enter your reset code and choose a secure new password.",
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"customer" | "professional">("customer");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") || "");
    if (mode === "login" && params.get("verified") === "1") {
      setSuccess("Your email is verified. You can sign in now.");
    } else if (mode === "login" && params.get("reset") === "1") {
      setSuccess("Your password has been updated. Sign in with your new password.");
    }
  }, [mode]);

  const c = copy[mode];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      (mode === "register" || mode === "reset-password") &&
      password !== confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        await apiRequest("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, confirmPassword, role }),
        });
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      if (mode === "login") {
        const result = await apiRequest<{ nextPath?: string }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        const next = new URLSearchParams(window.location.search).get("next");
        const safeNext =
          next && next.startsWith("/") && !next.startsWith("//")
            ? next
            : null;

        router.push(safeNext || result.nextPath || "/customer/dashboard");
        router.refresh();
        return;
      }

      if (mode === "verify-email") {
        const result = await apiRequest<{ nextPath?: string }>("/api/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ email, otp }),
        });

        router.push(
          `/login?verified=1&next=${encodeURIComponent(
            result.nextPath || "/customer/dashboard"
          )}`
        );
        return;
      }

      if (mode === "forgot-password") {
        await apiRequest("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });

        setSuccess("If your account exists, a reset code has been sent.");
        return;
      }

      if (mode === "reset-password") {
        await apiRequest("/api/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            email,
            otp,
            newPassword: password,
            confirmPassword,
          }),
        });

        router.push("/login?reset=1");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await apiRequest("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess("If verification is needed, a new code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code.");
    } finally {
      setLoading(false);
    }
  }

  const showPassword =
    mode === "login" || mode === "register" || mode === "reset-password";

  return (
    <div className="flex min-h-screen flex-col bg-styler-canvas text-styler-ink">
      <SiteHeader />

      <main className="flex flex-1 items-stretch">
        <div className="mx-auto grid w-full max-w-[1600px] flex-1 lg:grid-cols-2">
          <section className="relative isolate flex min-h-[250px] flex-col justify-end overflow-hidden px-5 py-7 sm:min-h-[290px] sm:px-10 sm:py-9 lg:min-h-[680px] lg:justify-between lg:px-12 lg:py-12 xl:px-20">
            <picture className="absolute inset-0 -z-10">
              <source media="(max-width: 767px)" srcSet="/images/hero-mobile.webp" />
              <img
                src="/images/hero-desktop.webp"
                alt=""
                className="h-full w-full object-cover object-[center_45%]"
              />
            </picture>
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#10121c]/95 via-[#10121c]/45 to-[#10121c]/10 lg:bg-gradient-to-r lg:from-[#10121c]/90 lg:via-[#10121c]/55 lg:to-[#10121c]/20" />

            <div className="relative z-10 hidden items-center gap-2 text-sm font-semibold text-white lg:flex">
              <Sparkles size={18} className="text-pink-200" />
              STYLER
            </div>

            <div className="relative z-10 max-w-xl text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-200">
                {c.eyebrow}
              </p>

              <h1 className="mt-3 max-w-lg font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:mt-4 lg:text-5xl xl:text-6xl">
                {c.title}
              </h1>

              <p className="mt-3 max-w-md text-sm leading-6 text-white/85 sm:text-base sm:leading-7 lg:mt-5">
                {c.description}
              </p>

              <div className="mt-4 flex items-center gap-2.5 text-xs text-white/90 sm:text-sm lg:mt-8">
                <ShieldCheck
                  size={17}
                  className="shrink-0 text-pink-200"
                />
                <span>A secure place to find your people and define your style.</span>
              </div>
            </div>

            <p className="relative z-10 mt-8 hidden text-xs text-white/70 lg:block">
              Find your people. Define your style.
            </p>
          </section>

          <section className="flex items-start justify-center px-4 py-8 sm:px-8 sm:py-10 lg:items-center lg:px-10 lg:py-12">
            <div className="w-full max-w-md border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-8 lg:p-9">
              <div className="mb-8">
                <div className="mb-4 flex h-10 w-10 items-center justify-center bg-styler-accent-soft text-styler-accent">
                  {mode.includes("password") ? (
                    <LockKeyhole size={21} />
                  ) : mode === "verify-email" ? (
                    <Mail size={21} />
                  ) : (
                    <Sparkles size={21} />
                  )}
                </div>

                <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  {mode === "login"
                    ? "Sign in"
                    : mode === "register"
                    ? "Create your account"
                    : c.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-styler-ink-soft">
                  {mode === "login"
                    ? "Enter your details to continue."
                    : mode === "register"
                    ? "A few details to get you started."
                    : c.description}
                </p>
              </div>

              <div className="space-y-4">
                {error && <Alert tone="error">{error}</Alert>}
                {success && <Alert tone="success">{success}</Alert>}
              </div>

              <form className="mt-6 space-y-5" onSubmit={submit}>
                {mode === "register" && (
                  <>
                    <div>
                      <p className="mb-3 text-sm font-medium">I want to</p>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            ["customer", "Find professionals"],
                            ["professional", "Offer services"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={role === value}
                            onClick={() => setRole(value)}
                            className={`border px-3 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-styler-accent ${
                              role === value
                                ? "border-styler-accent bg-styler-accent-soft/50 text-styler-ink"
                                : "border-styler-line text-styler-ink-soft hover:border-styler-accent"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Field
                      label="Full name"
                      placeholder="Your full name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                      inputClassName="rounded-sm px-3 py-3 text-sm focus:ring-2 focus:ring-pink-500/20"
                    />
                  </>
                )}

                <Field
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  inputClassName="rounded-sm px-3 py-3 text-sm focus:ring-2 focus:ring-pink-500/20"
                />

                {(mode === "verify-email" || mode === "reset-password") && (
                  <Field
                    label={mode === "verify-email" ? "Verification code" : "Password reset code"}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    minLength={6}
                    maxLength={6}
                    inputClassName="rounded-sm px-3 py-3 text-sm tracking-[0.25em] focus:ring-2 focus:ring-pink-500/20"
                  />
                )}

                {showPassword && (
                  <>
                    <Field
                      label={mode === "reset-password" ? "New password" : "Password"}
                      type="password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      maxLength={128}
                      inputClassName="rounded-sm px-3 py-3 text-sm focus:ring-2 focus:ring-pink-500/20"
                    />

                    {(mode === "register" || mode === "reset-password") && (
                      <Field
                        label="Confirm password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Enter password again"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        maxLength={128}
                        inputClassName="rounded-sm px-3 py-3 text-sm focus:ring-2 focus:ring-pink-500/20"
                      />
                    )}
                  </>
                )}

                {mode === "login" && (
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium text-styler-accent hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  className="mt-2 w-full justify-center rounded-sm py-3 text-sm"
                >
                  {mode === "login"
                    ? "Sign in"
                    : mode === "register"
                    ? "Create account"
                    : mode === "verify-email"
                    ? "Verify email"
                    : mode === "forgot-password"
                    ? "Send reset code"
                    : "Update password"}
                  <ArrowRight size={17} />
                </Button>
              </form>

              {mode === "forgot-password" && success && (
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 border border-styler-line px-4 py-3 text-sm font-semibold text-styler-ink transition-colors hover:border-styler-accent hover:text-styler-accent"
                >
                  Enter reset code
                  <ArrowRight size={16} />
                </Link>
              )}

              {mode === "verify-email" && (
                <button
                  type="button"
                  onClick={resend}
                  disabled={loading}
                  className="mt-5 w-full text-center text-sm text-styler-ink-soft hover:text-styler-accent disabled:opacity-50"
                >
                  Didn't receive the code?{" "}
                  <span className="font-semibold">Resend code</span>
                </button>
              )}

              <p className="mt-7 text-center text-sm text-styler-ink-soft">
                {mode === "login" ? (
                  <>
                    New to Styler?{" "}
                    <Link href="/register" className="font-semibold text-styler-accent hover:underline">
                      Create an account
                    </Link>
                  </>
                ) : mode === "register" ? (
                  <>
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-styler-accent hover:underline">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <Link href="/login" className="font-semibold text-styler-accent hover:underline">
                    Back to sign in
                  </Link>
                )}
              </p>

              {mode === "register" && (
                <p className="mt-8 border-t border-styler-line pt-5 text-center text-xs leading-6 text-styler-muted">
                  By creating an account, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-styler-ink">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline hover:text-styler-ink">
                    Privacy Policy
                  </Link>
                  .
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
