
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-styler-canvas text-styler-ink selection:bg-styler-accent-soft selection:text-styler-ink antialiased">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-md space-y-6 rounded-[24px] border border-styler-line bg-styler-surface p-8 text-center shadow-panel sm:p-10">
          {/* Warning Icon */}
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-styler-danger-bg text-styler-danger">
            <AlertTriangle size={28} />
          </div>

          {/* Heading and Description */}
          <div className="space-y-2">
            <h1 className="font-serif text-2xl font-normal text-styler-ink sm:text-3xl">
              That didn&apos;t go as planned.
            </h1>

            <p className="text-xs leading-relaxed text-styler-ink-soft">
              Something interrupted this page. Your account and booking
              data are not changed just because this screen failed.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-center">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-sm bg-styler-accent px-5 py-2.5 text-xs font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:bg-styler-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-styler-accent focus-visible:ring-offset-2"
            >
              <RefreshCw size={15} />
              <span>Try again</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-sm border border-styler-line bg-styler-surface px-5 py-2.5 text-xs font-semibold text-styler-ink transition-colors hover:bg-styler-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-styler-accent focus-visible:ring-offset-2"
            >
              <span>Back home</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
