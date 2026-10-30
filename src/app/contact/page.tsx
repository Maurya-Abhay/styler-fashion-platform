
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ContactForm } from "@/components/contact-form";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();

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

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-9 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <header className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-styler-accent">
            <Sparkles size={15} />
            We&apos;re here to help
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Let&apos;s make things{" "}
            <span className="text-styler-accent">clear.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-styler-ink-soft sm:text-base">
            Need help with your account, a booking, or choosing a fashion
            professional? Send us a note and our support team will follow up.
          </p>
        </header>

        <div className="mt-8 grid items-start gap-6 lg:mt-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
          <section
            aria-labelledby="contact-form-title"
            className="border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-8 lg:p-9"
          >
            <div className="mb-6">
              <h2 id="contact-form-title" className="text-2xl font-semibold tracking-tight">
                Send us a message
              </h2>
              <p className="mt-2 text-sm leading-6 text-styler-ink-soft">
                Share a few details and we&apos;ll make sure your message reaches the right team.
              </p>
            </div>
            <ContactForm />
          </section>

          <aside aria-labelledby="contact-info-title" className="space-y-4">
            <section className="border border-styler-line bg-styler-surface p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center bg-styler-accent-soft text-styler-accent">
                  <MessageCircle size={19} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-styler-accent">
                    Support
                  </p>
                  <h2 id="contact-info-title" className="mt-0.5 text-lg font-semibold">
                    We&apos;re listening.
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-styler-ink-soft">
                Tell us what you need help with. For booking questions, include
                the booking details in your message so we can assist faster.
              </p>
              <div className="mt-5 space-y-4 border-t border-styler-line pt-5">
                {SUPPORT_EMAIL && (
                  <div className="flex items-start gap-3">
                    <Mail size={17} className="mt-0.5 shrink-0 text-styler-accent" />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">Email support</h3>
                      <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-sm text-styler-ink-soft hover:text-styler-accent"
                      >
                        {SUPPORT_EMAIL}
                        <ArrowUpRight size={14} className="shrink-0" />
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin size={17} className="mt-0.5 shrink-0 text-styler-accent" />
                  <div>
                    <h3 className="text-sm font-semibold">Serving India</h3>
                    <p className="mt-1 text-sm leading-6 text-styler-ink-soft">
                      Support for customers and fashion professionals.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock3 size={17} className="mt-0.5 shrink-0 text-styler-accent" />
                  <div>
                    <h3 className="text-sm font-semibold">Response time</h3>
                    <p className="mt-1 text-sm leading-6 text-styler-ink-soft">
                      Our team will get back to you as soon as possible.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-styler-line bg-styler-accent-soft/50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-styler-accent" />
                <div>
                  <h2 className="text-sm font-semibold">Your details stay private</h2>
                  <p className="mt-1 text-sm leading-6 text-styler-ink-soft">
                    Your message is shared with Styler support so we can respond to your enquiry.
                  </p>
                </div>
              </div>
              <Link
                href="/professionals"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-styler-accent hover:underline"
              >
                Explore professionals
                <ArrowUpRight size={16} />
              </Link>
            </section>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
