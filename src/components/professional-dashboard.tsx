"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCw,
  Scissors,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { apiRequest, dateTime, humanize, money } from "@/components/api-client";
import { Alert, LoadingBlock } from "@/components/ui";

function StatusPill({ status }: { status: string }) {
  let tone = "bg-styler-surface-2 text-styler-ink-soft ";
  if (["confirmed", "transferred", "approved", "completed"].includes(status)) {
    tone = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50";
  } else if (["pending", "pending_payment", "sent"].includes(status)) {
    tone = "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50";
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize ${tone}`}>
      {humanize(status)}
    </span>
  );
}

export function ProfessionalDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [requestTotal, setRequestTotal] = useState(0);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [earnings, setEarnings] = useState<any>(null);
  const [weeklyEarnings, setWeeklyEarnings] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [reload, setReload] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestSearch, setRequestSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest<any>("/api/professional/dashboard");
        if (!active) return;
        setUser(result.user);
        setProfile(result.profile);
        setOffers(result.offers || []);
        setRequestTotal(Number(result.requestTotal) || 0);
        setBookings(result.bookings || []);
        setBookingTotal(Number(result.bookingTotal) || 0);
        setEarnings(result.earnings);
        setWeeklyEarnings(result.chartDays || []);
        setReadiness(result.readiness);
        setAccepting(Boolean(result.accepting));
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your workspace.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [reload]);

  async function toggleAvailability(value: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await apiRequest<any>("/api/professional/accepting-requests", {
        method: "PATCH",
        body: JSON.stringify({ acceptingRequests: value }),
      });
      setAccepting(Boolean(result?.acceptingRequests ?? value));
      setReadiness((current: any) => current ? { ...current, acceptingRequests: value } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your availability.");
    } finally {
      setBusy(false);
    }
  }

  const approved = profile?.applicationStatus === "approved";
  const firstName = (profile?.displayName || user?.name || "Professional").trim().split(/\s+/)[0];
  const profilePhoto = profile?.profilePhoto?.url || user?.profileImageUrl;

  const upcomingBookings = useMemo(
    () =>
      bookings
        .filter((booking) => {
          if (!["confirmed", "in_progress"].includes(booking.status)) return false;
          return booking.status === "in_progress" || new Date(booking.startAt).getTime() >= Date.now();
        })
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [bookings]
  );

  const filteredOffers = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    if (!query) return offers;
    return offers.filter((offer) =>
      [offer.request?.serviceCategory, offer.request?.city, offer.request?.requirements]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [offers, requestSearch]);

  const chartDays = useMemo(
    () => weeklyEarnings.map((item) => ({ date: new Date(item.date), amount: Number(item.amount) || 0 })),
    [weeklyEarnings],
  );
  const maxChartAmount = Math.max(...chartDays.map((day) => day.amount), 1);
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good Morning" : currentHour < 17 ? "Good Afternoon" : "Good Evening";
  const dateFormatted = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date());

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <div className="rounded border border-styler-line bg-styler-surface p-12 ">
          <LoadingBlock label="Preparing your studio…" />
        </div>
      ) : error && !profile ? (
        <section className="mx-auto max-w-xl rounded border border-styler-line bg-styler-surface p-8 text-center shadow-xs ">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-styler-accent-soft text-styler-accent ">
            <ShieldCheck size={20} />
          </span>
          <h1 className="mt-3 font-serif text-xl font-bold text-styler-ink ">Studio details couldn’t load</h1>
          <p className="mt-1 text-xs text-styler-muted ">Your professional dashboard needs your account and profile information to load.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-styler-accent px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-styler-accent"
          >
            Reload dashboard <ArrowRight size={14} />
          </button>
        </section>
      ) : !approved ? (
        <section className="mx-auto max-w-4xl rounded border border-styler-line bg-styler-surface p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-styler-accent ">Professional Studio</p>
              <h1 className="mt-1 font-serif text-2xl font-bold text-styler-ink ">Welcome{user?.name ? `, ${firstName}` : ""}.</h1>
              <p className="mt-1 text-xs text-styler-muted ">Your profile is {humanize(profile?.applicationStatus || "draft").toLowerCase()}. Complete your setup to get started.</p>
            </div>
            <StatusPill status={profile?.applicationStatus || "draft"} />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Link href="/professional/onboarding" className="group rounded border border-styler-line p-4 transition hover:border-styler-line-strong ">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-styler-accent-soft text-styler-accent "><Scissors size={16} /></span>
              <h2 className="mt-3 text-xs font-bold text-styler-ink ">Build your profile</h2>
              <p className="mt-0.5 text-[11px] text-styler-muted ">Add details, services, portfolio & documents.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-styler-accent ">Continue onboarding <ArrowRight size={13} /></span>
            </Link>
            <Link href="/professional/onboarding/availability" className="group rounded border border-styler-line p-4 transition hover:border-styler-line-strong ">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"><CalendarDays size={16} /></span>
              <h2 className="mt-3 text-xs font-bold text-styler-ink ">Set your schedule</h2>
              <p className="mt-0.5 text-[11px] text-styler-muted ">Choose when you work and keep availability active.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-styler-accent ">Set availability <ArrowRight size={13} /></span>
            </Link>
          </div>
        </section>
      ) : (
        <>
          {profile?.baseLocation?.latitude == null && (
            <Alert tone="warning">
              Set your studio location to receive bookings inside customers’ selected search radius.{" "}
              <Link href="/professional/profile" className="font-semibold underline underline-offset-2">
                Set service location
              </Link>
            </Alert>
          )}

          {/* Top Hero Welcome Card */}
          <section className="relative overflow-hidden rounded border border-styler-line bg-styler-surface p-5 sm:p-6 shadow-2xs">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="max-w-md">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-styler-ink sm:text-2xl">
                  {greeting}, {firstName}! <span className="inline-block animate-bounce">👋</span>
                </h1>
                <p className="mt-1 text-xs text-styler-muted ">Here's what's happening with your business today.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-styler-line bg-styler-surface-2 px-2.5 py-1 text-[10px] font-medium text-styler-ink-soft ">
                    <CalendarDays size={12} className="text-styler-accent" />
                    Today, {dateFormatted}
                  </span>
                  <Link
                    href="/professional/availability"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-styler-accent px-3 py-1 text-[11px] font-semibold text-white shadow-2xs transition hover:bg-styler-accent"
                  >
                    View Calendar
                  </Link>
                  <button
                    type="button"
                    onClick={() => setReload((value) => value + 1)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-styler-line px-3 py-1 text-[11px] font-semibold text-styler-ink-soft transition hover:bg-styler-surface-2 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>
              </div>

              <div className="relative hidden h-24 w-80 shrink-0 overflow-hidden rounded bg-slate-900 md:block">
                {profilePhoto ? (
                  <img src={profilePhoto} alt={firstName} className="h-full w-full object-cover opacity-80" />
                ) : (
                  <div className="flex h-full w-full items-center justify-between bg-gradient-to-r from-pink-950 to-slate-950 p-4">
                    <div className="text-white">
                      <p className="font-serif text-xs italic text-styler-accent">Your talent creates confidence in others.</p>
                      <p className="mt-1 text-[9px] font-semibold text-styler-muted">— {firstName}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Toggle Availability Bar */}
          <div className={`flex items-center justify-between rounded-xl border px-4 py-2.5 transition ${accepting ? "border-emerald-200/60 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20" : "border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"}`}>
            <div className="flex items-center gap-2.5">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${accepting ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                {accepting ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
              </div>
              <div>
                <p className={`text-[11px] font-bold ${accepting ? "text-emerald-950 dark:text-emerald-300" : "text-amber-950 dark:text-amber-300"}`}>
                  {accepting ? "Open for new requests" : "New requests paused"}
                </p>
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-styler-ink-soft ">
              <span>{busy ? "Updating…" : accepting ? "Active" : "Paused"}</span>
              <input
                type="checkbox"
                role="switch"
                checked={accepting}
                onChange={(e) => void toggleAvailability(e.target.checked)}
                disabled={busy}
                className="peer sr-only"
              />
              <span className={`relative h-5 w-9 rounded-full transition ${accepting ? "bg-emerald-500" : "bg-slate-300 "} after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-styler-surface after:shadow-2xs after:transition ${accepting ? "after:translate-x-4" : ""}`} />
            </label>
          </div>

          {/* 4 Primary Top Stats Cards (Fully Dynamic) */}
          <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <article className="rounded border border-styler-line bg-styler-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-styler-muted ">Total Bookings</p>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-styler-accent-soft text-styler-accent ">
                  <CalendarDays size={14} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-styler-ink ">{bookingTotal}</p>
              <p className="mt-1 text-[10px] font-medium text-styler-muted">Confirmed appointments</p>
            </article>

            <article className="rounded border border-styler-line bg-styler-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-styler-muted ">Pending Requests</p>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Clock3 size={14} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-styler-ink ">{requestTotal}</p>
              <Link href="/professional/requests" className="mt-1 block text-[10px] font-semibold text-styler-accent hover:underline">
                View All
              </Link>
            </article>

            <article className="rounded border border-styler-line bg-styler-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-styler-muted ">Total Earnings</p>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  <WalletCards size={14} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-styler-ink ">
                {money(earnings?.summary?.paidPaise)}
              </p>
              <p className="mt-1 text-[10px] font-medium text-styler-muted">Transferred payouts</p>
            </article>

            <article className="rounded border border-styler-line bg-styler-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-styler-muted ">Pending Payouts</p>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <Clock3 size={14} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-styler-ink ">
                {money(earnings?.summary?.pendingPaise)}
              </p>
              <p className="mt-1 text-[10px] font-medium text-styler-muted">{earnings?.summary?.pendingCount || 0} payout(s) awaiting action</p>
            </article>

            <article className="rounded border border-styler-line bg-styler-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-styler-muted ">Active Services</p>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Scissors size={14} />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-styler-ink ">{readiness?.activeServiceCount ?? 0}</p>
              <Link href="/professional/services" className="mt-1 block text-[10px] font-semibold text-styler-accent hover:underline">
                Manage your listings
              </Link>
            </article>

            <article className="rounded border border-styler-line bg-styler-surface p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium text-styler-muted ">Rating</p>
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400">
                  <Star size={14} fill="currentColor" />
                </span>
              </div>
              <p className="mt-2 text-xl font-bold tracking-tight text-styler-ink ">
                {profile?.rating ? Number(profile.rating).toFixed(1) : "N/A"}
              </p>
              <p className="mt-1 text-[10px] font-medium text-styler-muted">
                {profile?.reviewCount ? `(${profile.reviewCount} reviews)` : "No reviews yet"}
              </p>
            </article>
          </section>

          {/* Dynamic Workspace Layout */}
          <section className="grid gap-4 xl:grid-cols-12">
            {/* Dynamic Earnings Bar Chart */}
            <article className="rounded border border-styler-line bg-styler-surface p-5 xl:col-span-5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-styler-ink ">Earnings Overview</h2>
                <span className="text-[10px] text-styler-muted font-medium">Last 7 days</span>
              </div>

              <div className="mt-6 flex h-36 items-end gap-2 border-b border-l border-styler-line px-2 pb-2">
                {chartDays.map(({ date, amount }) => (
                  <div key={date.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="text-[8px] font-medium text-styler-muted">{amount > 0 ? money(amount) : ""}</span>
                    <div
                      title={`${date.toLocaleDateString("en-IN")}: ${money(amount)}`}
                      className={`w-full max-w-6 rounded-t-md transition-all ${amount > 0 ? "bg-gradient-to-t from-pink-600 to-pink-400" : "bg-styler-surface-2 "}`}
                      style={{ height: `${amount > 0 ? Math.max((amount / maxChartAmount) * 75, 12) : 6}%` }}
                    />
                    <span className="text-[8px] text-styler-muted">{new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date)}</span>
                  </div>
                ))}
              </div>
            </article>

            {/* Dynamic Recent Requests/Offers List */}
            <article className="rounded border border-styler-line bg-styler-surface p-5 xl:col-span-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-styler-ink ">New Requests</h2>
                <Link href="/professional/requests" className="text-[10px] font-semibold text-styler-accent hover:underline">
                  View All →
                </Link>
              </div>

              <div className="mt-3">
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-styler-muted" />
                  <input
                    type="search"
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    placeholder="Search category or city"
                    className="w-full rounded-lg bg-styler-surface-2 py-1.5 pl-7 pr-3 text-[10px] text-styler-ink placeholder-slate-400 outline-none"
                  />
                </div>

                {filteredOffers.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredOffers.slice(0, 4).map((offer) => (
                      <Link key={offer._id || offer.id} href="/professional/requests" className="flex items-center justify-between rounded-lg border border-styler-line p-2 hover:bg-styler-surface-2 transition">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-styler-accent-soft text-styler-accent "><Scissors size={14} /></span>
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-bold text-styler-ink ">{humanize(offer.request?.serviceCategory || "Fashion Service")}</p>
                            <p className="truncate text-[8px] text-styler-muted flex items-center gap-1"><MapPin size={9} />{offer.request?.city || "Location not provided"} · {dateTime(offer.expiresAt)}</p>
                          </div>
                        </div>
                        <StatusPill status={offer.status || "pending"} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded bg-styler-surface-2 p-4 text-center">
                    <p className="text-[10px] font-medium text-styler-muted ">No requests match your filter right now.</p>
                  </div>
                )}
              </div>
            </article>

            {/* Quick Actions & Upgrade Promo */}
            <article className="flex flex-col justify-between space-y-4 xl:col-span-3">
              <div className="rounded border border-styler-line bg-styler-surface p-4 shadow-2xs">
                <h2 className="text-xs font-bold text-styler-ink mb-3">Quick Actions</h2>
                <div className="space-y-2">
                  {[
                    { label: "View Requests", detail: `${requestTotal} pending`, href: "/professional/requests", icon: Activity, tone: "text-styler-accent bg-styler-accent-soft " },
                    { label: "Update Availability", detail: "Manage working slots", href: "/professional/availability", icon: CalendarDays, tone: "text-styler-accent bg-styler-accent-soft " },
                    { label: "Add New Service", detail: "Expand offerings", href: "/professional/services", icon: Scissors, tone: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40" },
                    { label: "View Earnings", detail: "Check payouts", href: "/professional/earnings", icon: WalletCards, tone: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40" },
                  ].map(({ label, detail, href, icon: Icon, tone }) => (
                    <Link key={href} href={href} className="flex items-center gap-2.5 rounded-xl border border-styler-line p-2 hover:bg-styler-surface-2 transition">
                      <span className={`grid h-7 w-7 place-items-center rounded-lg ${tone}`}><Icon size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-styler-ink ">{label}</p>
                        <p className="text-[8px] text-styler-muted truncate">{detail}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded bg-gradient-to-br from-slate-900 via-slate-950 to-pink-950 p-4 text-white shadow-2xs">
                <p className="text-xs font-bold">Grow Your Business</p>
                <p className="mt-0.5 text-[9px] text-slate-300">Get More Bookings with Styler Studio Pro.</p>
                <Link
                  href="/professional/portfolio"
                  className="mt-3 inline-block rounded-lg bg-styler-accent px-3 py-1 text-[10px] font-semibold text-white hover:bg-styler-accent transition"
                >
                  Upgrade Now
                </Link>
              </div>
            </article>
          </section>

          {/* Dynamic Upcoming Bookings Table */}
          <section className="rounded border border-styler-line bg-styler-surface p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold text-styler-ink ">Upcoming Bookings</h2>
                <p className="text-[10px] text-styler-muted">Confirmed customer appointments</p>
              </div>
              <Link href="/professional/bookings" className="text-[10px] font-semibold text-styler-accent hover:underline">
                View All →
              </Link>
            </div>

            {upcomingBookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-styler-line text-[9px] font-bold uppercase tracking-wider text-styler-muted ">
                      <th className="pb-2">Service</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Appointment</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-styler-line ">
                    {upcomingBookings.slice(0, 5).map((booking) => (
                      <tr key={booking._id || booking.id} className="hover:bg-styler-surface-2 ">
                        <td className="py-2.5 font-bold text-styler-ink ">
                          <Link href={`/professional/bookings/${booking._id || booking.id}`} className="hover:underline">
                            {booking.serviceSnapshot?.title || humanize(booking.serviceSnapshot?.category || "Fashion service")}
                          </Link>
                        </td>
                        <td className="py-2.5 text-styler-ink-soft ">
                          {booking.addressSnapshot?.recipientName || "Styler Customer"}
                        </td>
                        <td className="py-2.5 text-styler-muted ">
                          {dateTime(booking.startAt)}
                        </td>
                        <td className="py-2.5 text-right">
                          <StatusPill status={booking.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded bg-styler-surface-2 p-6 text-center ">
                <CalendarDays size={18} className="mx-auto text-styler-muted" />
                <p className="mt-2 text-xs font-bold text-styler-ink ">No upcoming bookings yet</p>
                <p className="text-[10px] text-styler-muted">Your confirmed appointments will automatically show up here.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}