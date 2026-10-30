
"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type LegalKind = "terms" | "privacy" | "about";

type LegalSection = {
  title: string;
  text: string;
  points?: string[];
};

const content: Record<Exclude<LegalKind, "about">, LegalSection[]> = {
  privacy: [
    {
      title: "Information you provide",
      text: "The information we use depends on how you use Styler. You may provide:",
      points: [
        "Account details such as your name, email address, phone number and login credentials.",
        "Profile information, service listings, photos, preferences and messages you choose to share.",
        "Booking requests, requirements, service addresses, appointment details and support enquiries.",
        "For professional applications, identity, address and other documents submitted for review.",
      ],
    },
    {
      title: "How we use information",
      text: "Styler uses information to operate and improve the marketplace, including to:",
      points: [
        "Create and secure accounts, verify email addresses and help prevent misuse.",
        "Match booking requests with relevant professionals and share the details needed to respond.",
        "Coordinate bookings, payments, refunds, customer support and important service updates.",
        "Review professional applications, manage disputes and meet applicable legal obligations.",
      ],
    },
    {
      title: "When information is shared",
      text: "We share only information needed to provide the service, for example:",
      points: [
        "Relevant request and contact details are shared with professionals who can respond to your booking.",
        "Payment, email, image-storage and hosting providers process information needed for their services.",
        "Information may be disclosed when required by law or needed to protect users and the platform.",
      ],
    },
    {
      title: "Payments and transaction records",
      text: "Payments are handled through the payment provider shown during checkout. Styler may keep transaction references, payment status, amounts and related booking records to support receipts, reconciliation, refunds and customer support. Do not send full card details, passwords or bank credentials in a support message.",
    },
    {
      title: "Storage, security and retention",
      text: "We use access controls and other safeguards intended to protect information. No online service can promise absolute security. Information is kept for as long as needed to provide the service, meet legal and accounting requirements, resolve disputes and enforce platform rules. Retention may differ by information type and legal obligations.",
    },
    {
      title: "Your choices and requests",
      text: "You can update profile information in your account where those controls are available. To ask about accessing, correcting or deleting account information, contact Styler through the contact page. We may need to verify your identity and may retain some records where law or legitimate operational needs require it.",
    },
    {
      title: "Policy updates and contact",
      text: "We may update this policy as the service changes. The current version will be published on this page. If you have a privacy question or request, contact the Styler team.",
    },
  ],
  terms: [
    {
      title: "What Styler provides",
      text: "Styler is an online marketplace that helps customers discover fashion professionals, review services and submit booking requests. Professionals provide the services; Styler is not the tailor, designer or stylist performing the work.",
    },
    {
      title: "Accounts and eligibility",
      text: "Keep your account details accurate and protect your sign-in credentials. You are responsible for activity carried out through your account. Contact Styler promptly if you believe someone has accessed it without permission. We may restrict accounts where needed to protect users or the platform.",
    },
    {
      title: "Requests, offers and confirmed bookings",
      text: "Customers should provide accurate service requirements, location and preferred timing. Professionals may respond based on their services and availability. A request or offer is not itself a confirmed appointment: follow the booking flow and any required payment steps shown in Styler to confirm it. Check the final booking details before proceeding.",
    },
    {
      title: "Pricing, payment and receipts",
      text: "Review the service price, any applicable fees and the total payable amount shown before payment. Payments are processed by the payment provider presented in the booking flow. Payment confirmation, settlement and refunds can take time to appear in bank or provider records. Styler may provide booking and payment records or receipts for completed transactions.",
    },
    {
      title: "Changes, cancellations and refunds",
      text: "Cancellation eligibility, charges and refund handling follow the rules shown for the booking when it is made, together with applicable law and payment-provider processing. Check those details before confirming. A refund request or initiation does not mean funds have already reached your account.",
    },
    {
      title: "Customer and professional responsibilities",
      text: "Customers should attend at the agreed time and location, provide accurate information and communicate changes promptly. Professionals should keep profiles, service descriptions, prices and availability accurate, and deliver accepted work with reasonable care and respectful conduct.",
    },
    {
      title: "Messages, photos and other content",
      text: "Only share content you have permission to use. Do not post unlawful, misleading, abusive or private information that does not belong to you. You remain responsible for content you submit and allow Styler to use it as needed to operate, display and support the service.",
    },
    {
      title: "Platform availability and account action",
      text: "We work to keep Styler available and reliable, but features may change or be temporarily unavailable. Styler may investigate reports, remove content or limit access when reasonably needed to enforce these terms, comply with law or protect users.",
    },
    {
      title: "Questions and updates",
      text: "These terms may be updated as Styler changes. The current version will be published here. If you have a question about a booking or these terms, contact the Styler team.",
    },
  ],
};

export function LegalPageClient({ kind }: { kind: LegalKind }) {
  const isAbout = kind === "about";
  const isPrivacy = kind === "privacy";
  const sections = isAbout ? [] : content[kind];

  const title = isAbout
    ? "Fashion, made personal."
    : isPrivacy
    ? "Your privacy matters."
    : "Clear terms. Better experiences.";

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
          <div className="mx-auto max-w-7xl">
            <header className="max-w-3xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-styler-accent">
                {isPrivacy ? <LockKeyhole size={15} /> : <FileText size={15} />}
                Styler information
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-styler-ink-soft sm:text-base">
                {isPrivacy
                  ? "A straightforward guide to the information involved when you use Styler, how it supports your bookings, and how to contact us about your data."
                  : "The practical guidelines for using Styler, requesting services, managing bookings and working with other members of the marketplace."}
              </p>
            </header>

            <div className="mt-8 grid items-start gap-6 lg:mt-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
              <aside className="border border-styler-line bg-styler-surface p-5 sm:p-6 lg:sticky lg:top-24">
                <details className="group lg:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
                    On this page
                    <ChevronDown size={17} className="text-styler-muted transition-transform group-open:rotate-180" />
                  </summary>
                  <nav aria-label={`${isPrivacy ? "Privacy policy" : "Terms"} sections`} className="mt-3 border-t border-styler-line pt-3">
                    <ol className="grid gap-1 sm:grid-cols-2">
                      {sections.map((section, index) => {
                        const id = `section-${index + 1}`;
                        return (
                          <li key={section.title}>
                            <a
                              href={`#${id}`}
                              className="flex items-start gap-2.5 px-2 py-2 text-sm leading-5 text-styler-ink-soft transition-colors hover:bg-styler-surface-2 hover:text-styler-accent"
                            >
                              <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-styler-accent">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              {section.title}
                            </a>
                          </li>
                        );
                      })}
                    </ol>
                  </nav>
                </details>
                <div className="hidden lg:block">
                  <h2 className="text-sm font-semibold">On this page</h2>
                  <nav aria-label={`${isPrivacy ? "Privacy policy" : "Terms"} sections`} className="mt-4">
                    <ol className="space-y-1">
                    {sections.map((section, index) => {
                      const id = `section-${index + 1}`;
                      return (
                        <li key={section.title}>
                          <a
                            href={`#${id}`}
                            className="flex items-start gap-2.5 px-2 py-2 text-sm leading-5 text-styler-ink-soft transition-colors hover:bg-styler-surface-2 hover:text-styler-accent"
                          >
                            <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-styler-accent">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            {section.title}
                          </a>
                        </li>
                      );
                    })}
                    </ol>
                  </nav>
                  <div className="mt-5 border-t border-styler-line pt-4">
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-2 text-sm font-semibold text-styler-accent hover:underline"
                    >
                      Ask us a question
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </aside>

              <div className="min-w-0">
                <div className="border border-styler-warning/30 bg-styler-warning-bg p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <ShieldCheck size={19} className="mt-0.5 shrink-0 text-styler-warning" />
                    <p className="text-sm leading-6 text-styler-warning">
                      This is a plain-language product summary, not legal advice. Have the final policies reviewed for your business and applicable Indian law before relying on them.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {sections.map((section, index) => (
                    <section
                      key={section.title}
                      id={`section-${index + 1}`}
                      className="scroll-mt-24 border border-styler-line bg-styler-surface p-5 sm:p-7"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center bg-styler-accent-soft text-xs font-bold tabular-nums text-styler-accent">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                            {section.title}
                          </h2>
                          <p className="mt-2 text-sm leading-7 text-styler-ink-soft">
                            {section.text}
                          </p>
                          {section.points && (
                            <ul className="mt-4 space-y-3">
                              {section.points.map((point) => (
                                <li key={point} className="flex items-start gap-2.5 text-sm leading-6 text-styler-ink-soft">
                                  <CheckCircle2 size={16} className="mt-1 shrink-0 text-styler-accent" />
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>

                <section className="mt-5 flex flex-col gap-4 border border-styler-line bg-styler-accent-soft/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-styler-accent">
                      Need a hand?
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">
                      We&apos;re here to help.
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-styler-ink-soft">
                      Get in touch with the Styler team about this page or your account.
                    </p>
                  </div>
                  <Link
                    href="/contact"
                    className="inline-flex shrink-0 items-center justify-center gap-2 bg-styler-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-styler-accent-strong"
                  >
                    Contact Styler
                    <ArrowRight size={16} />
                  </Link>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
