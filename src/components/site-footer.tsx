
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Logo } from "@/components/ui";

const EXPLORE_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/professionals", label: "Professionals" },
  { href: "/about", label: "About" },
];

const ACCOUNT_LINKS = [
  { href: "/login", label: "Login" },
  { href: "/register", label: "Create an account" },
  { href: "/contact", label: "Contact" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
];

const FOOTER_GROUPS = [
  { title: "Explore", links: EXPLORE_LINKS },
  { title: "Your account", links: ACCOUNT_LINKS },
  { title: "Information", links: LEGAL_LINKS },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-styler-line bg-styler-surface">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12">
          <div>
            <Link
              href="/"
              aria-label="Styler home"
              className="inline-flex"
            >
              <Logo />
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-7 text-styler-ink-soft">
              Your style, your way. Discover fashion professionals,
              explore their services and find the right fit for your next look.
            </p>

            <Link
              href="/professionals"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-styler-accent transition-colors hover:text-styler-ink"
            >
              Find a professional
              <ArrowUpRight size={16} />
            </Link>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav
              key={group.title}
              aria-label={group.title}
              className="flex flex-col items-start gap-3"
            >
              <h2 className="mb-1 text-sm font-semibold text-styler-ink">
                {group.title}
              </h2>

              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-styler-ink-soft transition-colors hover:text-styler-accent"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-styler-line pt-5 text-xs text-styler-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {currentYear} Styler. All rights reserved.</p>

          <p className="tracking-wide">
            Made for your individual style.
          </p>
        </div>
      </div>
    </footer>
  );
}
