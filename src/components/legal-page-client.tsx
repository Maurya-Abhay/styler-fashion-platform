
"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHeading } from "@/components/ui";

type LegalKind = "terms" | "privacy" | "about";

const content = {
  privacy: [
    {
      title: "Information we use",
      text: "Styler uses account information, contact details, service requests, addresses, booking records and payment status to operate the marketplace. Payment card and bank credentials should be handled by the payment provider and must not be stored in the Styler application database.",
    },
    {
      title: "Professional verification",
      text: "Professionals may provide identity and address documents for approval. These documents must be stored privately, accessed only by authorized reviewers and retained only as long as the platform needs them under its documented policy.",
    },
    {
      title: "Third-party providers",
      text: "Styler may use transactional email, image storage and payment service providers to deliver core functionality. Configure these services with appropriate access restrictions and review their terms before launch.",
    },
    {
      title: "Account and data requests",
      text: "To request assistance with account information, contact the Styler support team using the verified support address configured for your business.",
    },
  ],
  terms: [
    {
      title: "Bookings and availability",
      text: "Professional offers are sent based on service category, service area and availability. A request is not a confirmed booking until a professional accepts and payment is captured.",
    },
    {
      title: "Professional obligations",
      text: "Professionals must maintain accurate service listings, honor accepted bookings, and communicate changes promptly. Quality disputes are resolved through Styler's review process.",
    },
    {
      title: "Customer obligations",
      text: "Customers must provide accurate requirements, be available at the agreed time and location, and pay the agreed amount. Late cancellations may incur fees per the professional's policy.",
    },
    {
      title: "Payments and refunds",
      text: "Payments are processed through Styler's payment partner. Refunds follow the professional's cancellation policy and Styler's buyer protection terms.",
    },
    {
      title: "Limitation of liability",
      text: "Styler is a marketplace facilitator, not a party to service contracts. We do not guarantee specific outcomes, timelines or quality beyond our verification and review processes.",
    },
  ],
};

export function LegalPageClient({ kind }: { kind: LegalKind }) {
  const isAbout = kind === "about";
  const isPrivacy = kind === "privacy";

  const title = isAbout
    ? "Fashion, made personal."
    : isPrivacy
    ? "Privacy overview"
    : "Terms of use";

  return (
    <div className="flex min-h-screen flex-col bg-styler-canvas text-styler-ink">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-10 lg:px-8 lg:py-10">
        {isAbout ? (
          <>
            <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-styler-accent">
                  About Styler
                </p>

                <h1 className="mt-5 font-serif text-4xl font-normal leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Fashion should feel like{" "}
                  <span className="italic text-styler-accent">you.</span>
                </h1>

                <p className="mt-6 max-w-lg text-sm leading-7 text-styler-ink-soft sm:text-base">
                  Styler brings you closer to skilled fashion professionals
                  who listen to your ideas and help make them real — from
                  the first fitting to the final detail.
                </p>

                <Link
                  href="/professionals"
                  className="mt-8 inline-flex items-center gap-3 border-b border-styler-accent pb-2 text-sm font-semibold text-styler-accent transition-colors hover:text-styler-ink"
                >
                  Meet our professionals
                  <ArrowRight size={16} />
                </Link>

                <div className="mt-10 flex items-start gap-3 border-t border-styler-line pt-5">
                  <ShieldCheck
                    size={20}
                    className="mt-0.5 shrink-0 text-styler-accent"
                  />
                  <p className="max-w-sm text-sm leading-6 text-styler-ink-soft">
                    A more thoughtful way to discover fashion talent and
                    build trust through better service.
                  </p>
                </div>
              </div>

              <div className="relative min-h-[320px] overflow-hidden bg-styler-accent-soft sm:min-h-[440px] lg:min-h-[560px]">
                <img
                  src="/images/fashion-placeholder.svg"
                  alt="Fashion design inspiration"
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                <div className="absolute bottom-6 left-6 right-6 text-white sm:bottom-8 sm:left-8">
                  <Sparkles size={20} />
                  <p className="mt-3 font-serif text-2xl italic sm:text-3xl">
                    Made personal.
                  </p>
                  <p className="mt-2 text-sm text-white/85">
                    Your vision. Their craft. Your style.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-16 grid gap-10 border-t border-styler-line py-10 sm:mt-20 sm:grid-cols-2 sm:gap-12 sm:py-12">
              <article>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-styler-accent">
                  Our mission
                </p>
                <h2 className="mt-4 max-w-sm font-serif text-2xl leading-snug sm:text-3xl">
                  Make fashion personal again.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-styler-ink-soft">
                  We connect customers with tailors, designers and stylists
                  so finding the right expertise feels easy, considered
                  and human.
                </p>
              </article>

              <article className="border-t border-styler-line pt-8 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-styler-accent">
                  Our promise
                </p>
                <h2 className="mt-4 max-w-sm font-serif text-2xl leading-snug sm:text-3xl">
                  Good work starts with trust.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-styler-ink-soft">
                  Professional applications are reviewed before profiles
                  appear in the marketplace. Clear services and thoughtful
                  communication help customers choose with confidence.
                </p>
              </article>
            </section>
          </>
        ) : (
          <div className="mx-auto max-w-3xl">
            <PageHeading
              title={title}
              description={
                isPrivacy
                  ? "An overview of how Styler handles account and booking information."
                  : "The conditions and responsibilities involved in using Styler."
              }
            />

            <p className="mt-8 border-l-2 border-styler-accent bg-styler-surface-2 px-4 py-4 text-sm leading-6 text-styler-ink-soft">
              This page is a launch draft, not final legal advice. Have these
              policies reviewed for your business and applicable Indian law
              before publishing.
            </p>

            <div className="mt-10 divide-y divide-styler-line border-t border-styler-line">
              {content[kind].map((section, index) => (
                <section
                  key={section.title}
                  className="grid gap-3 py-7 sm:grid-cols-[52px_1fr] sm:gap-5 sm:py-8"
                >
                  <span className="font-serif text-lg text-styler-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <h2 className="font-serif text-xl font-normal sm:text-2xl">
                      {section.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-styler-ink-soft">
                      {section.text}
                    </p>
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-8 border-t border-styler-line pt-6 text-sm text-styler-ink-soft">
              Questions?{" "}
              <Link
                href="/contact"
                className="font-semibold text-styler-accent hover:underline"
              >
                Contact the Styler team
              </Link>
              .
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
