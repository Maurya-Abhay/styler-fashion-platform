"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PageHeading } from "@/components/ui";

export function LegalPage({ kind }: { kind: "terms" | "privacy" | "about" }) {
  const title =
    kind === "terms"
      ? "Terms of use"
      : kind === "privacy"
      ? "Privacy overview"
      : "Fashion, made personal";

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink selection:bg-styler-accent-soft selection:text-styler-ink antialiased flex flex-col justify-between">
      <div>
        <SiteHeader />

        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          {/* Header */}
          <PageHeading
            eyebrow="STYLER INFORMATION"
            title={title}
            description={
              kind === "privacy"
                ? "How Styler is designed to handle account and booking information."
                : kind === "terms"
                ? "Important conditions for using the Styler service marketplace."
                : "A service marketplace connecting customers with approved fashion professionals."
            }
          />

          {/* Legal Content Body */}
          <div className="mt-8 space-y-6 rounded-panel border border-styler-line bg-styler-surface p-6 shadow-soft sm:p-8">
            {/* Warning Banner */}
            <div className="rounded-sm border border-styler-warning/30 bg-styler-warning-bg p-4 text-xs leading-relaxed text-styler-warning font-medium">
              This page is a launch draft, not final legal advice. Before public launch, replace it with policies reviewed for your business and applicable Indian law.
            </div>

            <div className="prose prose-sm max-w-none text-styler-ink-soft space-y-6 text-sm leading-relaxed">
              {kind === "privacy" ? (
                <>
                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Information we use
                    </h2>
                    <p>
                      Styler uses account information, contact details, service requests, addresses, booking records and payment status to operate the marketplace. Payment card and bank credentials should be handled by the payment provider and must not be stored in the Styler application database.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Professional verification
                    </h2>
                    <p>
                      Professionals may provide identity and address documents for approval. These documents must be stored privately, accessed only by authorized reviewers and retained only as long as the platform needs them under its documented policy.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Third-party providers
                    </h2>
                    <p>
                      Styler may use transactional email, image storage and payment service providers to deliver core functionality. Configure these services with appropriate access restrictions and review their terms before launch.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Account and data requests
                    </h2>
                    <p>
                      To request assistance with account information, contact the Styler support team using the verified support address configured for your business.
                    </p>
                  </section>
                </>
              ) : kind === "terms" ? (
                <>
                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Bookings and availability
                    </h2>
                    <p>
                      Professional offers are sent based on service category, service area and availability. A request is not a confirmed appointment until a professional accepts, the customer completes the required payment and Styler verifies payment status.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Prices and commission
                    </h2>
                    <p>
                      The exact service price, platform fee, cancellation rules and any applicable tax must be disclosed to customers before payment. Professional commission is calculated under the platform policy applicable to the booking.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Cancellations and refunds
                    </h2>
                    <p>
                      Cancellations and refunds follow the policy presented at booking time and applicable payment-provider processing. Refund initiation does not necessarily mean the funds have already reached the original payment method.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Professional responsibilities
                    </h2>
                    <p>
                      Professionals are responsible for accurate service information, reliable availability, respectful conduct and delivering the agreed work. Styler may review, restrict or suspend accounts where required under platform policy.
                    </p>
                  </section>
                </>
              ) : (
                <>
                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      What Styler does
                    </h2>
                    <p>
                      Styler helps customers find fashion designers, tailors and stylists for personalised services, including tailoring, alterations, outfit design and consultations.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      How matching works
                    </h2>
                    <p>
                      Customers describe their service need, preferred time and location. Styler shares the request with up to ten eligible professionals. The first valid acceptance wins the offer, subject to payment and booking rules.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h2 className="font-serif text-xl font-medium text-styler-ink">
                      Built around trust
                    </h2>
                    <p>
                      Professional applications are reviewed before profiles become active in the marketplace. Customer and professional portals let each side track the request and appointment lifecycle.
                    </p>
                  </section>
                </>
              )}
            </div>

            <div className="border-t border-styler-line pt-6">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-sm bg-styler-accent px-5 py-2.5 text-xs font-semibold text-white shadow-soft transition-all hover:bg-styler-accent-strong hover:-translate-y-0.5"
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-16 border-t border-styler-line bg-styler-canvas py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-styler-muted sm:flex-row sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} Styler</span>
          <Link href="/professionals" className="font-semibold text-styler-accent hover:underline">
            Explore professionals
          </Link>
        </div>
      </footer>
    </div>
  );
}