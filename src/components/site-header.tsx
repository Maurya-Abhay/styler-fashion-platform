
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, LogOut, Menu, UserRound, X } from "lucide-react";

import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/components/api-client";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/professionals", label: "Professionals" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [logoutError, setLogoutError] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    let active = true;
    setAccountLoading(true);
    apiRequest<any>("/api/auth/me")
      .then((result) => {
        if (active) setAccount(result?.user || result);
      })
      .catch(() => {
        if (active) setAccount(null);
      })
      .finally(() => {
        if (active) setAccountLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const portalPath = account?.role === "admin"
    ? "/admin/dashboard"
    : account?.role === "professional"
      ? "/professional/dashboard"
      : "/customer/dashboard";
  const profilePath = account?.role === "professional"
    ? "/professional/profile"
    : account?.role === "admin"
      ? "/admin/settings"
      : "/customer/profile";

  async function logout() {
    setLogoutError("");
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setAccount(null);
      setAccountMenuOpen(false);
      setMobileMenuOpen(false);
      router.refresh();
    } catch (cause) {
      setLogoutError(cause instanceof Error ? cause.message : "Could not sign out.");
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-styler-line bg-styler-canvas/95 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Styler home"
            className="shrink-0"
          >
            <Logo />
          </Link>

          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 md:flex lg:gap-8"
          >
            {NAV_LINKS.map((link) => {
              const active = isActivePath(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative py-2 text-sm transition-colors ${
                    active
                      ? "font-semibold text-styler-accent"
                      : "text-styler-ink-soft hover:text-styler-ink"
                  }`}
                >
                  {link.label}

                  <span
                    className={`absolute inset-x-0 -bottom-1 h-px origin-left bg-styler-accent transition-transform duration-200 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {!accountLoading && (
              <div className="relative hidden items-center gap-3 sm:flex">
                {account ? (
                  <>
                    <Link href={portalPath} className="px-3 py-2 text-sm font-medium text-styler-ink transition-colors hover:text-styler-accent">
                      My workspace
                    </Link>
                    <button
                      type="button"
                      onClick={() => setAccountMenuOpen((open) => !open)}
                      aria-expanded={accountMenuOpen}
                      aria-haspopup="menu"
                      className="inline-flex items-center gap-2 border border-styler-line bg-styler-surface px-3 py-2 text-sm font-medium text-styler-ink hover:border-styler-line-strong"
                    >
                      <UserRound size={16} aria-hidden />
                      <span className="max-w-32 truncate">{account.name || "Account"}</span>
                      <ChevronDown size={14} aria-hidden />
                    </button>
                    {accountMenuOpen && (
                      <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 border border-styler-line bg-styler-surface p-1 shadow-panel">
                        <Link role="menuitem" href={profilePath} onClick={() => setAccountMenuOpen(false)} className="block px-3 py-2 text-sm text-styler-ink hover:bg-styler-surface-2">
                          Profile & account
                        </Link>
                        <Link role="menuitem" href={portalPath} onClick={() => setAccountMenuOpen(false)} className="block px-3 py-2 text-sm text-styler-ink hover:bg-styler-surface-2">
                          Open workspace
                        </Link>
                        <button role="menuitem" type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-styler-danger hover:bg-styler-danger-bg">
                          <LogOut size={14} aria-hidden /> Sign out
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Link href="/login" className="px-3 py-2 text-sm font-medium text-styler-ink transition-colors hover:text-styler-accent">
                      Login
                    </Link>
                    <Link href="/register" className="inline-flex items-center gap-2 bg-styler-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-styler-accent-strong">
                      Get started <ArrowRight size={15} />
                    </Link>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              className="inline-flex h-10 w-10 items-center justify-center border border-styler-line text-styler-ink transition-colors hover:bg-styler-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-styler-accent md:hidden"
            >
              <Menu size={21} />
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />

          <aside
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col border-l border-styler-line bg-styler-canvas shadow-2xl animate-in slide-in-from-right duration-200"
          >
            <div className="flex h-16 items-center justify-between border-b border-styler-line px-5">
              <Logo />

              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center border border-styler-line text-styler-ink transition-colors hover:bg-styler-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-styler-accent"
              >
                <X size={20} />
              </button>
            </div>

            <nav
              aria-label="Mobile navigation"
              className="flex-1 overflow-y-auto px-5 py-7"
            >
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-styler-muted">
                Explore Styler
              </p>

              <div className="space-y-1">
                {NAV_LINKS.map((link) => {
                  const active = isActivePath(pathname, link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center justify-between border-b border-styler-line py-4 text-base transition-colors ${
                        active
                          ? "font-semibold text-styler-accent"
                          : "text-styler-ink hover:text-styler-accent"
                      }`}
                    >
                      {link.label}
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-styler-accent" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </nav>

            {!accountLoading && (
              <div className="space-y-3 border-t border-styler-line p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {logoutError && <p role="alert" className="text-xs text-styler-danger">{logoutError}</p>}
                {account ? (
                  <>
                    <p className="text-sm font-semibold text-styler-ink">{account.name || "Your account"}</p>
                    <Link href={profilePath} onClick={() => setMobileMenuOpen(false)} className="flex w-full items-center justify-center border border-styler-line px-4 py-3 text-sm font-medium text-styler-ink hover:bg-styler-surface-2">
                      Profile & account
                    </Link>
                    <Link href={portalPath} onClick={() => setMobileMenuOpen(false)} className="flex w-full items-center justify-center bg-styler-accent px-4 py-3 text-sm font-medium text-white hover:bg-styler-accent-strong">
                      Open workspace
                    </Link>
                    <button type="button" onClick={() => void logout()} className="flex w-full items-center justify-center gap-2 border border-styler-line px-4 py-3 text-sm font-medium text-styler-ink hover:bg-styler-surface-2">
                      <LogOut size={15} /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-4 text-sm leading-6 text-styler-ink-soft">Your next style story starts here.</p>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex w-full items-center justify-center border border-styler-line px-4 py-3 text-sm font-medium text-styler-ink hover:bg-styler-surface-2">Login</Link>
                    <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex w-full items-center justify-center gap-2 bg-styler-accent px-4 py-3 text-sm font-medium text-white hover:bg-styler-accent-strong">
                      Get started <ArrowRight size={16} />
                    </Link>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
