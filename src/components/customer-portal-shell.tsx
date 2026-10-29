"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { apiRequest } from "@/components/api-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo, LoadingBlock } from "@/components/ui";

type NavItem = { label: string; href: string; icon: LucideIcon };

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
  { label: "Find professionals", href: "/professionals", icon: Search },
  { label: "My bookings", href: "/customer/bookings", icon: CalendarDays },
  { label: "Notifications", href: "/customer/notifications", icon: Bell },
  { label: "Favorites", href: "/customer/favorites", icon: Heart },
  { label: "Addresses", href: "/customer/addresses", icon: MapPin },
  { label: "Payments", href: "/customer/payments", icon: CreditCard },
  { label: "Profile", href: "/customer/profile", icon: UserRound },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "C";
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

export function CustomerPortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    apiRequest<any>("/api/auth/me")
      .then((result) => {
        if (!active) return;
        const account = result?.user || result;
        if (account?.role !== "customer") {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setUser(account);
      })
      .catch(() => {
        if (active) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  useEffect(() => setMobileMenuOpen(false), [pathname]);

  useEffect(() => {
    let active = true;
    apiRequest<any>("/api/notifications?limit=1&unreadOnly=true")
      .then((result) => {
        if (active) setUnreadCount(Number(result?.total) || 0);
      })
      .catch(() => {
        if (active) setUnreadCount(0);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

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

  function searchProfessionals(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/professionals?q=${encodeURIComponent(value)}` : "/professionals");
  }

  const activeHref = navigation.find(({ href }) =>
    href === "/customer/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)
  )?.href;

  const pageTitle =
    pathname === "/customer/bookings/new"
      ? "New Booking Request"
      : pathname.startsWith("/customer/bookings/")
        ? "Booking Details"
        : navigation.find(({ href }) => href === activeHref)?.label || "Customer Space";

  const name = user?.name || "Customer";

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-styler-canvas p-6">
        <LoadingBlock label="Preparing your Styler space..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-styler-canvas text-styler-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-styler-line bg-styler-surface lg:flex">
        <div className="px-6 pb-4 pt-6"><Logo /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3" aria-label="Customer navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
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
                <div className="relative flex items-center">
                  <Icon size={18} aria-hidden />
                </div>
                <span className="flex-1 truncate">{label}</span>
                {label === "Notifications" && unreadCount > 0 && (
                  <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    active ? "bg-white text-styler-accent" : "bg-styler-accent-soft text-styler-accent"
                  }`}>
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
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-3 pb-3" aria-label="Mobile navigation">
              {navigation.map(({ href, label, icon: Icon }) => {
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
                    <Icon size={18} aria-hidden />
                    <span className="flex-1 truncate">{label}</span>
                    {label === "Notifications" && unreadCount > 0 && (
                      <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        active ? "bg-white text-styler-accent" : "bg-styler-accent-soft text-styler-accent"
                      }`}>
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
              {/* Search Bar */}
              <form onSubmit={searchProfessionals} className="hidden w-48 items-center gap-2 rounded-xl border border-styler-line bg-styler-surface px-3 py-1.5 focus-within:border-styler-accent md:flex lg:w-60">
                <Search size={15} className="shrink-0 text-styler-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search professionals"
                  placeholder="Search professionals..."
                  className="min-w-0 flex-1 bg-transparent text-xs text-styler-ink outline-none placeholder:text-styler-muted"
                />
              </form>

              {/* Notifications shortcut icon */}
              <Link
                href="/customer/notifications"
                aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-styler-line bg-styler-surface text-styler-ink-soft hover:text-styler-accent"
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
                  <p className="text-[11px] text-styler-muted">Customer</p>
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
          <nav className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden" aria-label="Customer quick navigation">
            {navigation.map(({ href, label, icon: Icon }) => {
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
                    <span className="ml-1 rounded-full bg-white px-1.5 py-0.2 text-[9px] font-bold text-styler-accent">
                      {unreadCount}
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