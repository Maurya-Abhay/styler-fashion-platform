"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity, Bell, CalendarDays, Clock3, CreditCard, FileCheck2, Image as PortfolioIcon, LayoutDashboard,
  LogOut, Menu, Scissors, Settings, ShieldCheck, SlidersHorizontal, Star, User, Users, WalletCards, BarChart3, X,
  type LucideIcon,
} from "lucide-react";
import { apiRequest } from "@/components/api-client";
import { ProfessionalIncomingOffer } from "@/components/professional-incoming-offer";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo, LoadingBlock } from "@/components/ui";

type Role = "professional" | "admin";
type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV: Record<Role, NavItem[]> = {
  professional: [
    { label: "Dashboard", href: "/professional/dashboard", icon: LayoutDashboard },
    { label: "Requests", href: "/professional/requests", icon: Activity },
    { label: "Notifications", href: "/professional/notifications", icon: Bell },
    { label: "Bookings", href: "/professional/bookings", icon: CalendarDays },
    { label: "Availability", href: "/professional/availability", icon: Clock3 },
    { label: "Earnings", href: "/professional/earnings", icon: WalletCards },
    { label: "Services", href: "/professional/services", icon: Scissors },
    { label: "Portfolio", href: "/professional/portfolio", icon: PortfolioIcon },
    { label: "Reviews", href: "/professional/reviews", icon: Star },
    { label: "Profile", href: "/professional/profile", icon: User },
    { label: "Settings", href: "/professional/settings", icon: Settings },
  ],
  admin: [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
    { label: "Applications", href: "/admin/applications", icon: FileCheck2 },
    { label: "Professionals", href: "/admin/professionals", icon: Users },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Contact Inbox", href: "/admin/contact-messages", icon: Bell },
    { label: "Requests", href: "/admin/booking-requests", icon: Activity },
    { label: "Bookings", href: "/admin/bookings", icon: CalendarDays },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "UPI Verification", href: "/admin/payout-accounts", icon: ShieldCheck },
    { label: "Payouts", href: "/admin/payouts", icon: WalletCards },
    { label: "Commissions", href: "/admin/commissions", icon: SlidersHorizontal },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ShieldCheck },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
};

const ROLE_LABEL: Record<Role, string> = { professional: "Professional", admin: "Super Admin" };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "S";
}

function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      className="inline-flex items-center justify-center rounded-full bg-styler-accent-soft font-semibold text-styler-accent"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function PortalShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = NAV[role];
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // Authenticate once per portal session (layouts persist across client navigation).
  useEffect(() => {
    let active = true;
    apiRequest<any>("/api/auth/me")
      .then((data) => {
        if (!active) return;
        const account = data?.user || data;
        if (account?.role !== role) {
          router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setUser(account);
      })
      .catch(() => active && router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    let active = true;
    let loadingCount = false;
    const refreshCount = async () => {
      if (document.hidden || loadingCount) return;
      loadingCount = true;
      try {
        const result = await apiRequest<any>("/api/notifications?limit=1&unreadOnly=true");
        if (active) setUnreadCount(Number(result?.total) || 0);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load notification count.");
      } finally {
        loadingCount = false;
      }
    };
    void refreshCount();
    const timer = window.setInterval(() => void refreshCount(), 15_000);
    const onVisibilityChange = () => {
      if (!document.hidden) void refreshCount();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onVisibilityChange);
    };
  }, [pathname, role]);

  const activeHref = useMemo(() => {
    if (role === "professional") {
      if (pathname.startsWith("/professional/onboarding/services")) return "/professional/services";
      if (pathname.startsWith("/professional/onboarding/availability")) return "/professional/availability";
      if (pathname.startsWith("/professional/onboarding")) return "/professional/settings";
    }
    return nav.find(({ href }) => pathname === href || pathname.startsWith(`${href}/`))?.href;
  }, [pathname, nav, role]);

  const pageTitle =
    pathname.startsWith("/professional/onboarding/documents") ? "Verification documents"
    : pathname.startsWith("/professional/onboarding") ? "Profile setup"
    : nav.find((item) => item.href === activeHref)?.label || "Dashboard";

  async function handleLogout() {
    setLoggingOut(true);
    setError("");
    try {
      await apiRequest("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign out.");
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-styler-canvas p-6">
        <LoadingBlock label="Loading your workspace…" />
      </div>
    );
  }

  const name: string = user.name || ROLE_LABEL[role];

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-styler-line bg-styler-surface lg:flex">
        <div className="px-6 pb-4 pt-6"><Logo /></div>
        <nav className="thin-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label={`${ROLE_LABEL[role]} navigation`}>
          {nav.map(({ href, label, icon: Icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-styler-accent text-white shadow-soft" : "text-styler-ink-soft hover:bg-styler-surface-2 hover:text-styler-ink"
                }`}
              >
                <Icon size={18} aria-hidden /> <span className="flex-1">{label}</span>
                {label === "Notifications" && unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-styler-accent-soft px-1.5 text-[10px] font-bold text-styler-accent">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-styler-line p-3">
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-styler-ink-soft transition-colors hover:bg-styler-danger-bg hover:text-styler-danger disabled:opacity-60"
          >
            <LogOut size={18} aria-hidden /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
            aria-hidden="true"
          />
          {/* Drawer Panel */}
          <div className="relative flex w-full max-w-xs flex-col bg-styler-surface pb-6 shadow-xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-styler-line">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-1.5 text-styler-ink-soft hover:bg-styler-surface-2"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="thin-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pt-3 pb-3" aria-label="Mobile navigation">
              {nav.map(({ href, label, icon: Icon }) => {
                const active = href === activeHref;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                      active ? "bg-styler-accent text-white shadow-soft" : "text-styler-ink-soft hover:bg-styler-surface-2 hover:text-styler-ink"
                    }`}
                  >
                    <Icon size={18} aria-hidden /> <span className="flex-1">{label}</span>
                    {label === "Notifications" && unreadCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-styler-accent-soft px-1.5 text-[10px] font-bold text-styler-accent">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-styler-line px-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-styler-ink-soft transition-colors hover:bg-styler-danger-bg hover:text-styler-danger"
              >
                <LogOut size={18} aria-hidden /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="lg:pl-[248px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-styler-line bg-styler-canvas/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* Mobile menu trigger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-styler-line bg-styler-surface text-styler-ink lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>
              <span className="hidden sm:inline-block lg:hidden"><Logo /></span>
              <h1 className="truncate text-base sm:text-lg font-semibold">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={role === "admin" ? "/admin/notifications" : "/professional/notifications"}
                aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-styler-line bg-styler-surface text-styler-ink-soft transition hover:text-styler-accent"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-styler-accent px-1 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <ThemeToggle />
              <div className="hidden items-center gap-2 sm:flex">
                <Avatar name={name} src={user.profileImageUrl} size={34} />
                <div className="leading-tight">
                  <p className="max-w-[140px] truncate text-sm font-semibold">{name}</p>
                  <p className="text-[11px] text-styler-muted">{ROLE_LABEL[role]}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(true)}
                disabled={loggingOut}
                aria-label="Logout"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-styler-line bg-styler-surface text-styler-ink-soft hover:text-styler-danger sm:hidden"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
          {/* Mobile / tablet: quick scrollable link pills bar */}
          <nav className="no-scrollbar thin-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden" aria-label={`${ROLE_LABEL[role]} quick navigation`}>
            {nav.map(({ href, label, icon: Icon }) => {
              const active = href === activeHref;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? "border-styler-accent bg-styler-accent text-white" : "border-styler-line bg-styler-surface text-styler-ink-soft hover:text-styler-ink"
                  }`}
                >
                  <Icon size={14} aria-hidden /> {label}
                  {label === "Notifications" && unreadCount > 0 && (
                    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-styler-accent-soft px-1 text-[9px] font-bold text-styler-accent">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="p-4 sm:p-6" id="main">
          {error && <p role="alert" className="mb-4 rounded-xl bg-styler-danger-bg px-4 py-3 text-sm text-styler-danger">{error}</p>}
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      {role === "professional" && <ProfessionalIncomingOffer />}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => !loggingOut && setShowLogoutModal(false)} 
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-styler-surface p-6 shadow-2xl border border-styler-line space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-styler-danger-bg text-styler-danger">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-styler-ink">Sign out</h3>
                <p className="text-sm text-styler-ink-soft">Are you sure you want to end your current session?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className="rounded-xl border border-styler-line px-4 py-2.5 text-sm font-semibold text-styler-ink hover:bg-styler-surface-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl bg-styler-danger px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loggingOut ? "Signing out…" : "Yes, Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}