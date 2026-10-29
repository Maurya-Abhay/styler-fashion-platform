
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-styler-canvas text-styler-ink antialiased">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <section className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-styler-line bg-styler-surface px-6 py-10 text-center shadow-panel sm:px-12 sm:py-14">
          {/* Background Decorations */}
          <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full bg-styler-accent-soft/70 blur-3xl" />

          <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-styler-accent-soft blur-3xl" />

          {/* Icon */}
          <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full bg-styler-accent-soft text-styler-accent">
            <Compass size={30} />
          </div>

          {/* Page Label */}
          <p className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-styler-surface-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-styler-accent">
            <Sparkles size={12} />
            PAGE NOT FOUND
          </p>

          {/* Error Code */}
          <h1 className="relative mt-2 text-[6rem] font-extrabold leading-none tracking-tight text-styler-accent sm:text-[8rem]">
            404
          </h1>

          {/* Heading */}
          <h2 className="relative mt-1 text-2xl font-bold text-styler-ink sm:text-3xl">
            Oops! This page can&apos;t be found.
          </h2>

          {/* Description */}
          <p className="relative mx-auto mt-3 max-w-md text-sm leading-6 text-styler-ink-soft">
            The page may have moved or the link may be out of date.
            Let&apos;s get you back on track.
          </p>

          {/* Navigation Actions */}
          <div className="relative mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-styler-accent px-5 py-3 text-xs font-semibold text-white shadow-soft transition hover:bg-styler-accent-strong"
            >
              <ArrowLeft size={15} />
              Back to home
            </Link>

            <Link
              href="/professionals"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-styler-line-strong bg-styler-surface px-5 py-3 text-xs font-semibold text-styler-ink transition hover:bg-styler-surface-2"
            >
              Browse professionals
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
