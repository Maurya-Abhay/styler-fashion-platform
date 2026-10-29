
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, MessageCircle } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "@/components/contact-form";

const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@styler.example";

export const metadata: Metadata = {
  title: "Contact Us | Styler",
  description:
    "Have a question about Styler? Contact our team for help with your account, bookings, or fashion professional services.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Us | Styler",
    description:
      "Get in touch with the Styler team. We're here to help.",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink antialiased">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-10 lg:px-8 lg:py-10">
        <header className="max-w-3xl">

          <h1 className="mt-4 text-4xl font-normal leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Let&apos;s talk about{" "}
            <span className="italic text-styler-accent">what you need.</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-7 text-styler-ink-soft sm:text-base">
            Questions about your account, a booking, or finding the right
            fashion professional? Send us a message and our team will get
            back to you.
          </p>
        </header>

        <div className="mt-10 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.7fr)] lg:gap-20">
          <section aria-labelledby="contact-form-title">
            <div className="mb-6">
              <h2
                id="contact-form-title"
                className="text-2xl font-medium tracking-tight"
              >
                Send us a message
              </h2>
              <p className="mt-2 text-sm leading-6 text-styler-ink-soft">
                Fill in the details below and tell us how we can help.
              </p>
            </div>

            <div className="border-t border-styler-line pt-6">
              <ContactForm />
            </div>
          </section>

          <aside
            aria-labelledby="contact-info-title"
            className="h-fit border-t border-styler-line pt-6 lg:pt-0 lg:border-t-0"
          >
            <h2
              id="contact-info-title"
              className="text-2xl font-medium tracking-tight"
            >
              Get in touch
            </h2>

            <p className="mt-3 text-sm leading-7 text-styler-ink-soft">
              Prefer email? Reach out directly and include a few details
              about your question so we can assist you.
            </p>

            <div className="mt-8 space-y-7">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-styler-accent">
                  <Mail size={20} strokeWidth={1.7} />
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">Email support</h3>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-sm text-styler-ink-soft transition-colors hover:text-styler-accent"
                  >
                    {SUPPORT_EMAIL}
                    <ArrowUpRight size={14} className="shrink-0" />
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-styler-accent">
                  <MessageCircle size={20} strokeWidth={1.7} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">How can we help?</h3>
                  <p className="mt-2 text-sm leading-6 text-styler-ink-soft">
                    Contact us about bookings, account questions, or
                    professional services.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-0.5 text-styler-accent">
                  <MapPin size={20} strokeWidth={1.7} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold">Our market</h3>
                  <p className="mt-2 text-sm text-styler-ink-soft">
                    India
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-styler-line pt-6">
              <p className="text-sm leading-6 text-styler-ink-soft">
                Already looking for a fashion expert?
              </p>

              <Link
                href="/professionals"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-styler-accent transition-colors hover:text-styler-ink"
              >
                Explore professionals
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
