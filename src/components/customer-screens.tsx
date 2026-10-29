"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Heart,
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  apiRequest,
  dateTime,
  humanize,
  money,
  unwrapItems,
} from "@/components/api-client";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  LoadingBlock,
  PageHeading,
  SelectField,
  StatusBadge,
  TextAreaField,
} from "@/components/ui";
import { getCurrentCoordinates, reverseGeocode } from "@/lib/location";
import { CATEGORIES } from "@/lib/categories";
import { BookingChat } from "@/components/booking-chat";

declare global {
  interface Window {
    Razorpay?: new (options: any) => { open: () => void };
  }
}

/* -------------------------------------------------------------------------- */
/* CUSTOMER DASHBOARD                                                         */
/* -------------------------------------------------------------------------- */

export function CustomerDashboard() {
  const [me, setMe] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest<any>("/api/auth/me"),
      apiRequest<any>("/api/bookings?limit=5"),
      apiRequest<any>("/api/booking-requests?limit=5"),
      apiRequest<any>("/api/notifications?limit=4"),
    ])
      .then(([u, b, r, n]) => {
        setMe(u?.user || u);
        setBookings(unwrapItems(b));
        setRequests(unwrapItems(r));
        setNotifications(unwrapItems(n));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const active = bookings.filter((b) =>
    ["confirmed", "in_progress", "pending_payment"].includes(b.status)
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title={`Good to see you${me?.name ? `, ${me.name.split(" ")[0]}` : ""}.`}
        description="Your appointments, requests and style plans — all in one place."
        action={
          <Link
            href="/customer/bookings/new"
            className="inline-flex items-center gap-1.5 rounded bg-pink-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-pink-700 transition"
          >
            <Plus size={15} /> New Request
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Upcoming Bookings</span>
                <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                  <CalendarDays size={15} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
                {active.length}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-400">Confirmed or awaiting payment</div>
            </Card>

            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Open Requests</span>
                <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                  <Clock3 size={15} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
                {requests.filter((r) => ["matching", "offers_sent"].includes(r.status)).length}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-400">Professionals being matched</div>
            </Card>

            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Total Appointments</span>
                <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                  <CheckCircle2 size={15} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
                {bookings.length}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-400">Your Styler history</div>
            </Card>

            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Unread Updates</span>
                <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                  <Bell size={15} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
                {notifications.filter((n) => !n.readAt).length}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-400">Booking & account alerts</div>
            </Card>
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Main Column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Upcoming Appointments */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 dark:text-white">Your Upcoming Appointments</h2>
                    <p className="text-[10px] text-gray-400">Keep an eye on the next steps.</p>
                  </div>
                  <Link href="/customer/bookings" className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline">
                    View all <ArrowRight size={13} />
                  </Link>
                </div>

                {active.length ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {active.slice(0, 4).map((b: any) => (
                      <div className="flex items-center justify-between py-2.5 text-xs" key={b._id}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shrink-0">
                            <CalendarDays size={16} />
                          </div>
                          <div className="min-w-0">
                            <strong className="block font-bold text-gray-900 dark:text-white truncate">
                              {b.serviceSnapshot?.title || "Styler appointment"}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              {dateTime(b.startAt)} • {b.addressSnapshot?.city || "Location saved"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StatusBadge status={b.status} />
                          <strong className="font-bold text-gray-900 dark:text-white">{money(b.priceSnapshot?.totalPaise)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Your calendar is yours to fill"
                    description="Find a fashion professional and send your first request."
                    icon={<CalendarDays size={20} />}
                    action={
                      <Link href="/customer/bookings/new" className="inline-flex items-center gap-1 rounded bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 transition">
                        Book a Service <ArrowRight size={13} />
                      </Link>
                    }
                  />
                )}
              </Card>

              {/* Recent Requests */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white">Recent Requests</h2>
                  <p className="text-[10px] text-gray-400">See where your request is in the matching process.</p>
                </div>

                {requests.length ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {requests.slice(0, 4).map((r: any) => (
                      <div className="flex items-center justify-between py-2.5 text-xs" key={r._id}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shrink-0">
                            <Sparkles size={16} />
                          </div>
                          <div className="min-w-0">
                            <strong className="block font-bold text-gray-900 dark:text-white truncate">
                              {humanize(r.serviceCategory || "Fashion service")}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              {r.addressSnapshot?.city || "Location"} • {dateTime(r.createdAt)}
                            </span>
                          </div>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-2">You have not sent a booking request yet.</p>
                )}
              </Card>
            </div>

            {/* Right Sidebar Column */}
            <div className="space-y-5">
              {/* Quick Actions */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white">Quick Actions</h2>
                  <p className="text-[10px] text-gray-400">Pick up where you left off.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link href="/professionals" className="p-2.5 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:bg-gray-100 dark:hover:bg-gray-800/60 transition group space-y-1">
                    <span className="p-1.5 rounded bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 inline-block">
                      <Search size={14} />
                    </span>
                    <strong className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-pink-600 transition">Find Pro</strong>
                    <span className="block text-[9px] text-gray-400">Explore talent</span>
                  </Link>

                  <Link href="/customer/bookings/new" className="p-2.5 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:bg-gray-100 dark:hover:bg-gray-800/60 transition group space-y-1">
                    <span className="p-1.5 rounded bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 inline-block">
                      <CalendarDays size={14} />
                    </span>
                    <strong className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-pink-600 transition">New Request</strong>
                    <span className="block text-[9px] text-gray-400">Custom service</span>
                  </Link>

                  <Link href="/customer/addresses" className="p-2.5 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:bg-gray-100 dark:hover:bg-gray-800/60 transition group space-y-1">
                    <span className="p-1.5 rounded bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 inline-block">
                      <MapPin size={14} />
                    </span>
                    <strong className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-pink-600 transition">Addresses</strong>
                    <span className="block text-[9px] text-gray-400">Saved locations</span>
                  </Link>

                  <Link href="/customer/profile" className="p-2.5 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#121620] hover:bg-gray-100 dark:hover:bg-gray-800/60 transition group space-y-1">
                    <span className="p-1.5 rounded bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-300 inline-block">
                      <UserRound size={14} />
                    </span>
                    <strong className="block text-xs font-bold text-gray-900 dark:text-white group-hover:text-pink-600 transition">My Profile</strong>
                    <span className="block text-[9px] text-gray-400">Manage account</span>
                  </Link>
                </div>
              </Card>

              {/* Account Details */}
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 dark:text-white">Account Details</h2>
                    <p className="text-[10px] text-gray-400">Verified sign-in info.</p>
                  </div>
                  <ShieldCheck size={16} className="text-pink-600 dark:text-pink-400" />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Name</span>
                    <strong className="font-bold text-gray-900 dark:text-white">{me?.name || "—"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Email</span>
                    <strong className="font-bold text-gray-900 dark:text-white">{me?.email || "—"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Mobile</span>
                    <strong className="font-bold text-gray-900 dark:text-white">{me?.phone || "—"}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Email Status</span>
                    <StatusBadge status={me?.emailVerified ? "verified" : "pending"} />
                  </div>
                </div>

                <div className="pt-1">
                  <Link href="/customer/profile" className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline">
                    Manage profile <ArrowRight size={13} />
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BOOKING REQUEST FORM                                                       */
/* -------------------------------------------------------------------------- */

type BookingAddressDraft = {
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

export function BookingRequestForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [category, setCategory] = useState("lehenga_stitching");
  const [requirements, setRequirements] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(25);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [address, setAddress] = useState<BookingAddressDraft>({
    recipientName: "",
    phone: "+91",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "Haryana",
    postalCode: "",
    country: "India",
  });
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);

  useEffect(() => {
    apiRequest<any>("/api/customer/addresses")
      .then((v) => setSavedAddresses(unwrapItems(v)))
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get("service")) setCategory(params.get("service") || "lehenga_stitching");
  }, []);

  function changeAddress(key: Exclude<keyof BookingAddressDraft, "latitude" | "longitude">, value: string) {
    setAddress((current) => {
      const updated = { ...current, [key]: value };
      if (["line1", "line2", "landmark", "city", "state", "postalCode"].includes(key)) {
        updated.latitude = undefined;
        updated.longitude = undefined;
      }
      return updated;
    });
  }

  async function useCurrentLocation() {
    setLocating(true);
    setLocationMessage("");
    try {
      const coordinates = await getCurrentCoordinates();
      const found = await reverseGeocode(coordinates);
      setAddress((current) => ({
        ...current,
        line1: found.line1,
        city: found.city,
        state: found.state,
        postalCode: found.postalCode,
        country: found.country,
        latitude: found.latitude,
        longitude: found.longitude,
      }));
      setLocationMessage("Address filled from your current location. Please verify it before submitting.");
    } catch (cause) {
      setLocationMessage(cause instanceof Error ? cause.message : "Could not look up your location.");
    } finally {
      setLocating(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const startAt = new Date(`${date}T${start}:00+05:30`);
      const endAt = new Date(`${date}T${end}:00+05:30`);
      const payload = {
        serviceCategory: category,
        requirements,
        referenceImages: [],
        addressSnapshot: address,
        searchRadiusKm,
        budgetMinPaise: budgetMin ? Math.round(Number(budgetMin) * 100) : undefined,
        budgetMaxPaise: budgetMax ? Math.round(Number(budgetMax) * 100) : undefined,
        preferredStartAt: startAt.toISOString(),
        preferredEndAt: endAt.toISOString(),
        requestedDurationMinutes: Math.max(15, Math.round((endAt.getTime() - startAt.getTime()) / 60000)),
      };
      const result = await apiRequest<any>("/api/booking-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess("Your request has been sent to suitable professionals.");
      const id = result?.requestId || result?.bookingRequestId
        || result?.request?._id || result?.request?.id || result?._id || result?.id;
      if (id) router.push(`/customer/bookings?request=${id}`);
      else router.push("/customer/bookings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Tell us what you have in mind"
        description="We'll share your request with up to 10 approved professionals who fit your service, location and time."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={submit} className="lg:col-span-2 space-y-5">
          {/* Step 1: Style Brief */}
          <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="grid h-6 w-6 place-items-center rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-xs">
                01
              </span>
              <div>
                <h2 className="text-xs font-bold text-gray-900 dark:text-white">Your Style Brief</h2>
                <p className="text-[10px] text-gray-400">Choose the service and share details.</p>
              </div>
            </div>

            <div className="space-y-3">
              <SelectField
                label="Service Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map((item) => (
                  <option value={item.slug} key={item.slug}>
                    {item.label}
                  </option>
                ))}
              </SelectField>

              <TextAreaField
                label="What do you need?"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Describe the outfit, occasion, fit or style you're looking for…"
                required
                minLength={10}
                maxLength={4000}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Minimum Budget (₹)"
                  type="number"
                  min="0"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Optional"
                />
                <Field
                  label="Maximum Budget (₹)"
                  type="number"
                  min="0"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            {/* Preferred Time */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-3 pb-1">
                <span className="grid h-6 w-6 place-items-center rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-xs">
                  02
                </span>
                <div>
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white">Preferred Time Window</h2>
                  <p className="text-[10px] text-gray-400">Time window professionals see in the offer.</p>
                </div>
              </div>

              <Field
                label="Preferred Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 10)}
              />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Start Time" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
                <Field label="End Time" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
              </div>
            </div>
          </Card>

          {/* Step 3: Service Address */}
          <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="grid h-6 w-6 place-items-center rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-xs">
                03
              </span>
              <div>
                <h2 className="text-xs font-bold text-gray-900 dark:text-white">Where should your professional come?</h2>
                <p className="text-[10px] text-gray-400">Address is shared only with assigned professionals.</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={locating}
                className="inline-flex items-center gap-2 rounded border border-styler-line px-3 py-2 text-xs font-semibold text-styler-accent hover:bg-styler-accent-soft disabled:opacity-60"
              >
                <LocateFixed size={14} />
                {locating ? "Finding your location..." : "Use my current location"}
              </button>
              <p className="text-[10px] text-styler-muted">
                        Location is requested only when you tap this button. OpenStreetMap receives coordinates to look up your address; the exact address is shared with the professional only after they accept. Without GPS, matching uses your city and state.
              </p>
              <a
                        href="https://www.openstreetmap.org/copyright"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-styler-muted underline underline-offset-2"
              >
                        © OpenStreetMap contributors
              </a>
              {locationMessage && (
                <p role="status" className="text-[11px] text-styler-ink-soft">{locationMessage}</p>
              )}
            </div>

            {savedAddresses.length > 0 && (
              <SelectField
                label="Use a saved address"
                defaultValue=""
                onChange={(e) => {
                  const found = savedAddresses.find((a) => String(a._id) === e.target.value);
                  if (found) {
                    setAddress((current) => ({
                      ...current,
                      ...found,
                      recipientName: found.recipientName || "",
                      phone: found.phone || current.phone,
                    }));
                  }
                }}
              >
                <option value="">Enter a new address</option>
                {savedAddresses.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.label || "Address"} • {a.city}
                  </option>
                ))}
              </SelectField>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Recipient Name" value={address.recipientName} onChange={(e) => changeAddress("recipientName", e.target.value)} required />
              <Field label="Contact Number" type="tel" value={address.phone} onChange={(e) => changeAddress("phone", e.target.value)} required />
              <Field label="Address Line 1" value={address.line1} onChange={(e) => changeAddress("line1", e.target.value)} required />
              <Field label="Address Line 2 (optional)" value={address.line2} onChange={(e) => changeAddress("line2", e.target.value)} />
              <Field label="Landmark (optional)" value={address.landmark} onChange={(e) => changeAddress("landmark", e.target.value)} />
              <Field label="City" value={address.city} onChange={(e) => changeAddress("city", e.target.value)} required />
              <Field label="State" value={address.state} onChange={(e) => changeAddress("state", e.target.value)} required />
              <Field label="PIN Code" value={address.postalCode} onChange={(e) => changeAddress("postalCode", e.target.value)} required minLength={4} />
            </div>

            <SelectField
              label="Professional search radius"
              value={String(searchRadiusKm)}
              onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
            >
              {[5, 10, 25, 50, 100].map((radius) => (
                <option key={radius} value={radius}>{radius} km</option>
              ))}
            </SelectField>

            {error && <Alert tone="error">{error}</Alert>}
            {success && <Alert tone="success">{success}</Alert>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Link href="/customer/dashboard" className="inline-flex items-center gap-1 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3.5 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </Link>
              <Button loading={busy} type="submit">
                Send Request <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </Card>
        </form>

        {/* Side Info */}
        <div className="space-y-4">
          <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
              <Sparkles size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Styler Match</span>
            </div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-white">Good style is a conversation.</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your request reaches up to 10 suitable, approved professionals. The first one to accept gets the offer, and you'll see booking details before you pay.
            </p>
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Clock3 size={14} className="text-pink-600 dark:text-pink-400 shrink-0" />
                <span>Each offer has a 10-minute response window.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-pink-600 dark:text-pink-400 shrink-0" />
                <span>Payment is verified before booking is confirmed.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BOOKING LIST & REVIEWS                                                     */
/* -------------------------------------------------------------------------- */

export function BookingList() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [review, setReview] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const refreshing = useRef(false);

  async function load(showLoading = true) {
    if (refreshing.current) return;
    refreshing.current = true;
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [b, r] = await Promise.all([
        apiRequest<any>("/api/bookings?limit=50"),
        apiRequest<any>("/api/booking-requests?limit=50"),
      ]);
      setBookings(unwrapItems(b));
      setRequests(unwrapItems(r));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load bookings.");
    } finally {
      if (showLoading) setLoading(false);
      refreshing.current = false;
    }
  }

  useEffect(() => {
    void load();
    const refresh = () => {
      if (!document.hidden) void load(false);
    };
    const timer = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  async function startPayment(b: any) {
    setBusy(b._id);
    setError("");
    try {
      const order = await apiRequest<any>("/api/payments/order", {
        method: "POST",
        body: JSON.stringify({ bookingId: String(b._id) }),
      });
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not load. Refresh and try again.");
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency || "INR",
        name: "Styler",
        description: b.serviceSnapshot?.title || "Styler booking",
        order_id: order.orderId,
        prefill: {},
        theme: { color: "#db2777" },
        handler: async (response: any) => {
          try {
            await apiRequest("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                bookingId: String(b._id),
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            setNotice("Payment verified. Your booking status is being updated.");
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Payment verification is pending.");
          }
        },
      });
      checkout.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment.");
    } finally {
      setBusy("");
    }
  }

  async function cancel(b: any) {
    const reason = window.prompt("Please tell us why you're cancelling (at least 3 characters).");
    if (!reason || reason.trim().length < 3) return;
    setBusy(String(b._id));
    try {
      await apiRequest(`/api/bookings/${b._id}/cancel`, {
        method: "POST",
        headers: { "Idempotency-Key": `cancel:${b._id}:${Date.now()}` },
        body: JSON.stringify({ reason }),
      });
      setNotice("Cancellation request processed. Check booking for refund status.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel booking.");
    } finally {
      setBusy("");
    }
  }

  async function submitReview(e: FormEvent) {
    e.preventDefault();
    if (!review) return;
    setBusy(String(review._id));
    try {
      await apiRequest("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ bookingId: String(review._id), rating, comment }),
      });
      setReview(null);
      setNotice("Thanks for sharing your review.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit review.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <PageHeading
        title="Bookings & Requests"
        description="Follow your requests from the first match to the final appointment."
        action={
          <Link href="/customer/bookings/new" className="inline-flex items-center gap-1.5 rounded bg-pink-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-pink-700 transition">
            <Plus size={15} /> New Request
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {/* Confirmed Bookings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white">Confirmed & Upcoming</h2>
            <p className="text-[10px] text-gray-400">Appointments assigned to you.</p>
          </div>
          <Button variant="secondary" onClick={() => void load()} loading={loading}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>

        {loading ? (
          <LoadingBlock />
        ) : bookings.length ? (
          <div className="space-y-2.5">
            {bookings.map((b: any) => (
              <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex flex-col sm:flex-row items-start justify-between gap-3" key={b._id}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shrink-0">
                    <CalendarDays size={18} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {b.serviceSnapshot?.title || humanize(b.serviceSnapshot?.category || "Styler booking")}
                      </h3>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {dateTime(b.startAt)} • {b.addressSnapshot?.city || "Saved location"}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {[b.addressSnapshot?.city, b.addressSnapshot?.state].filter(Boolean).join(", ")}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                        <CreditCard size={12} /> {money(b.priceSnapshot?.totalPaise)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  <Link href={`/customer/bookings/${b._id}`} className="inline-flex items-center gap-1 rounded bg-gray-100 dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                    View Details <ArrowRight size={13} />
                  </Link>

                  {b.status === "pending_payment" && (
                    <Button loading={busy === b._id} onClick={() => startPayment(b)}>
                      Pay Securely <CreditCard size={13} className="ml-1" />
                    </Button>
                  )}

                  {["confirmed", "pending_payment"].includes(b.status) && (
                    <Button variant="ghost" onClick={() => cancel(b)} loading={busy === b._id}>
                      Cancel
                    </Button>
                  )}

                  {b.status === "completed" && !b.reviewId && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setReview(b);
                        setRating(5);
                        setComment("");
                      }}
                    >
                      Leave Review <Star size={13} className="ml-1" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
            <EmptyState
              title="No bookings yet"
              description="When a professional accepts your request and payment is verified, your appointment will appear here."
              icon={<CalendarDays size={22} />}
              action={
                <Link href="/customer/bookings/new" className="inline-flex items-center gap-1 rounded bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 transition">
                  Create Request <ArrowRight size={13} />
                </Link>
              }
            />
          </Card>
        )}
      </div>

      {/* Matching Requests */}
      <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xs font-bold text-gray-900 dark:text-white">Matching Requests</h2>
          <p className="text-[10px] text-gray-400">Requests update automatically every 15 seconds.</p>
        </div>

        {requests.length ? (
          <div className="space-y-2">
            {requests.map((r: any) => (
              <Card className="rounded p-3.5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex items-start gap-3" key={r._id}>
                <div className="p-2 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {humanize(r.serviceCategory || "Fashion service")}
                    </h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{r.requirements}</p>
                  {r.status === "no_match" && r.noMatchReason && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">{r.noMatchReason}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400 pt-0.5">
                    <span>{[r.addressSnapshot?.city, r.addressSnapshot?.state].filter(Boolean).join(", ")}</span>
                    <span>Search radius: {r.searchRadiusKm ?? 25} km</span>
                    <span>Created: {dateTime(r.createdAt)}</span>
                    <span>Deadline: {dateTime(r.offerDeadlineAt)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2">No requests are currently being matched.</p>
        )}
      </div>

      {/* Review Modal */}
      {review && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs">
          <form className="w-full max-w-md rounded bg-white dark:bg-[#1a1f2b] p-5 shadow-2xl space-y-4 border border-gray-100 dark:border-gray-800" onSubmit={submitReview}>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">How did it go?</h2>
              <p className="text-xs text-gray-400">Your review helps others find the right professional.</p>
            </div>

            <div className="flex items-center gap-1 justify-center py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)} className="p-1 text-amber-400 transition hover:scale-110">
                  <Star size={24} fill={n <= rating ? "currentColor" : "none"} />
                </button>
              ))}
            </div>

            <TextAreaField label="Your Review" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share a few words about your experience…" maxLength={2000} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setReview(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy === String(review._id)}>
                Submit Review
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BOOKING DETAIL                                                             */
/* -------------------------------------------------------------------------- */

export function BookingDetail({ id, backHref = "/customer/bookings" }: { id: string; backHref?: string }) {
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest<any>(`/api/bookings/${id}`)
      .then(setBooking)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Your Appointment"
        description="Review the service details, schedule, location and status."
        action={
          <Link href={backHref} className="inline-flex items-center gap-1.5 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3.5 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Back to Bookings
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : booking ? (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            {/* Service & Price Summary */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    {booking.serviceSnapshot?.title || "Styler appointment"}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-mono">ID: {booking._id}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Appointment Time</span>
                  <strong className="font-bold text-gray-900 dark:text-white">{dateTime(booking.startAt)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Duration</span>
                  <strong className="font-bold text-gray-900 dark:text-white">{booking.serviceSnapshot?.durationMinutes || 60} mins</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Service Price</span>
                  <strong className="font-bold text-gray-900 dark:text-white">{money(booking.priceSnapshot?.servicePricePaise)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Platform Fee</span>
                  <strong className="font-bold text-gray-900 dark:text-white">{money(booking.priceSnapshot?.customerPlatformFeePaise)}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Total</span>
                  <strong className="font-bold text-pink-600 dark:text-pink-400">{money(booking.priceSnapshot?.totalPaise)}</strong>
                </div>
              </div>
            </Card>

            {/* Service Location */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <h2 className="text-xs font-bold text-gray-900 dark:text-white">Service Location</h2>
                <MapPin size={16} className="text-pink-600 dark:text-pink-400" />
              </div>

              <strong className="block text-xs font-bold text-gray-900 dark:text-white">
                {booking.addressSnapshot?.recipientName}
              </strong>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {[
                  booking.addressSnapshot?.line1,
                  booking.addressSnapshot?.line2,
                  booking.addressSnapshot?.landmark,
                  [booking.addressSnapshot?.city, booking.addressSnapshot?.state, booking.addressSnapshot?.postalCode].filter(Boolean).join(", "),
                  booking.addressSnapshot?.country,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </p>
            </Card>
          </div>

          <div className="space-y-5">
            {/* Timeline */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                <h2 className="text-xs font-bold text-gray-900 dark:text-white">Booking Timeline</h2>
              </div>

              {(booking.statusHistory || []).length ? (
                <div className="space-y-3 text-xs border-l-2 border-gray-100 dark:border-gray-800 pl-3">
                  {booking.statusHistory.map((s: any, i: number) => (
                    <div className="relative space-y-0.5" key={i}>
                      <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-pink-600" />
                      <strong className="block font-bold text-gray-900 dark:text-white">{humanize(s.status)}</strong>
                      <span className="block text-[10px] text-gray-400">{dateTime(s.changedAt)}</span>
                      {s.note && <p className="text-[11px] text-gray-500">{s.note}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No status history available yet.</p>
              )}
            </Card>

            {/* Support */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
              <h2 className="text-xs font-bold text-gray-900 dark:text-white">Need Help?</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Keep your booking reference handy when contacting support.
              </p>
              <a
                href={`mailto:support@styler.com?subject=${encodeURIComponent(`Styler booking ${booking._id}`)}`}
                className="inline-flex w-full items-center justify-center rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Contact Support
              </a>
            </Card>
          </div>
        </div>
        <BookingChat bookingId={id} />
        </>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState title="Booking not found" description="This booking may not exist or you may not have access to it." />
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CUSTOMER PROFILE                                                           */
/* -------------------------------------------------------------------------- */

export function CustomerProfile() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    apiRequest<any>("/api/customer/profile")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const v = await apiRequest<any>("/api/customer/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: data.name, profileImageUrl: data.profileImageUrl || "" }),
      });
      setData(v);
      setNotice("Your profile has been saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading title="Your Profile" description="Keep your details up to date so appointments feel effortless." />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="h-12 w-12 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-base grid place-items-center shrink-0">
              {(data?.name || "S").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">{data?.name || "Your Account"}</h2>
              <p className="text-xs text-gray-400">{data?.email}</p>
              <div className="mt-1">
                <StatusBadge status={data?.emailVerifiedAt ? "verified" : "pending"} />
              </div>
            </div>
          </div>

          <Field label="Full Name" value={data?.name || ""} onChange={(e) => setData({ ...data, name: e.target.value })} required minLength={2} />
          <Field label="Email Address" type="email" value={data?.email || ""} disabled help="Email is your verified login identifier." />
          <Field label="Mobile Number" value={data?.phone || ""} disabled help="Phone verification will be enabled in a later release." />
          <Field
            label="Profile Photo URL (optional)"
            value={data?.profileImageUrl || ""}
            onChange={(e) => setData({ ...data, profileImageUrl: e.target.value })}
            placeholder="https://…"
            type="url"
          />

          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button loading={busy} type="submit">
              Save Changes <CheckCircle2 size={14} className="ml-1" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ADDRESS MANAGER                                                            */
/* -------------------------------------------------------------------------- */

export function AddressManager() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({
    label: "Home",
    recipientName: "",
    phone: "+91",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "Haryana",
    postalCode: "",
    country: "India",
    isDefault: false,
  });
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    try {
      setItems(unwrapItems(await apiRequest<any>("/api/customer/addresses")));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load addresses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await apiRequest("/api/customer/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: form.label,
          isDefault: form.isDefault,
          address: {
            recipientName: form.recipientName,
            phone: form.phone,
            line1: form.line1,
            line2: form.line2 || undefined,
            landmark: form.landmark || undefined,
            city: form.city,
            state: form.state,
            postalCode: form.postalCode,
            country: form.country,
          },
        }),
      });
      setNotice("Address saved.");
      setShowForm(false);
      setForm({
        label: "Home",
        recipientName: "",
        phone: "+91",
        line1: "",
        line2: "",
        landmark: "",
        city: "",
        state: "Haryana",
        postalCode: "",
        country: "India",
        isDefault: false,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save address.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this saved address?")) return;
    try {
      await apiRequest(`/api/customer/addresses/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove address.");
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Saved Addresses"
        description="Save the places where you'd like a Styler professional to meet you."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={15} className="mr-1" /> Add Address
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {/* Add Address Collapsible Form */}
      {showForm && (
        <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-4">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white">Add a New Address</h2>
            <p className="text-[10px] text-gray-400">Used to help your professional find you easily.</p>
          </div>

          <form className="space-y-3" onSubmit={save}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              <Field label="Recipient Name" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required />
              <Field label="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              <Field label="Address Line 1" value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
              <Field label="Address Line 2" value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
              <Field label="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
              <Field label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
              <Field label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
              <Field label="PIN Code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} required />
              <Field label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 pt-1">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Set as default address
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy}>
                Save Address
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((a) => (
            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-2 flex flex-col justify-between" key={a._id}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                      <MapPin size={15} />
                    </span>
                    <strong className="text-xs font-bold text-gray-900 dark:text-white">{a.label || "Saved Address"}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {a.isDefault && <StatusBadge status="default" />}
                    <button
                      className="p-1 text-gray-400 hover:text-rose-500 transition"
                      aria-label="Remove address"
                      onClick={() => remove(a._id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-0.5">
                  <strong className="block text-gray-900 dark:text-white">{a.recipientName}</strong>
                  <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed whitespace-pre-line">
                    {[a.line1, a.line2, a.landmark, [a.city, a.state, a.postalCode].filter(Boolean).join(", "), a.country].filter(Boolean).join("\n")}
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">{a.phone}</div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState
            title="No saved addresses"
            description="Save a home or studio address to make your next booking quicker."
            icon={<MapPin size={22} />}
            action={
              <Button onClick={() => setShowForm(true)}>
                <Plus size={14} className="mr-1" /> Add Address
              </Button>
            }
          />
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* NOTIFICATIONS PAGE                                                         */
/* -------------------------------------------------------------------------- */

function decodeVapidKey(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(normalized) : "";
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNotice, setPushNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const d = await apiRequest<any>("/api/notifications?limit=50");
      setItems(unwrapItems(d));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function read(n: any) {
    try {
      await apiRequest(`/api/notifications/${n._id}/read`, { method: "PATCH", body: JSON.stringify({}) });
      setItems((v) => v.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update notification.");
    }
  }

  async function enablePush() {
    setPushBusy(true);
    setError("");
    setPushNotice("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
        throw new Error("Web push is not supported by this browser.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Browser notification permission was not granted.");
      const data = await apiRequest<any>("/api/notifications/push-subscriptions");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(data.publicKey) as unknown as BufferSource,
        }));
      const json = subscription.toJSON();
      if (!json.keys?.p256dh || !json.keys?.auth)
        throw new Error("Browser returned an incomplete push subscription.");
      await apiRequest("/api/notifications/push-subscriptions", {
        method: "POST",
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: json.keys,
          expirationTime: json.expirationTime ?? null,
        }),
      });
      setPushNotice("Browser notifications are enabled for this device.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enable browser notifications.");
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Notifications"
        description="Booking updates, account notes and important moments from Styler."
        action={
          <Button variant="secondary" onClick={load} loading={loading}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {pushNotice && <Alert tone="success">{pushNotice}</Alert>}

      {/* Push Settings */}
      <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-bold text-gray-900 dark:text-white">Browser Notifications</h2>
          <p className="text-[10px] text-gray-400">Enable push alerts for real-time booking updates.</p>
        </div>
        <Button onClick={enablePush} loading={pushBusy}>
          <Bell size={14} className="mr-1" /> Enable Alerts
        </Button>
      </Card>

      {/* Notifications List */}
      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="space-y-2.5">
          {items.map((n) => (
            <Card
              className={`rounded p-3.5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex items-start justify-between gap-3 ${
                n.readAt ? "opacity-75" : ""
              }`}
              key={n._id}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shrink-0">
                  <Bell size={15} />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{n.title}</h3>
                    {!n.readAt && <span className="h-1.5 w-1.5 rounded bg-pink-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{dateTime(n.createdAt)}</span>
                    {(n.channels || []).filter((c: string) => c !== "in_app").map((c: string) => (
                      <span key={c} className="capitalize">• {humanize(c)}</span>
                    ))}
                  </div>
                </div>
              </div>

              {!n.readAt && (
                <Button variant="secondary" onClick={() => read(n)}>
                  Mark Read
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState title="You're all caught up" description="New booking and account updates will appear here." icon={<Bell size={22} />} />
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CUSTOMER FAVORITES SCREEN                                                  */
/* -------------------------------------------------------------------------- */

export function CustomerFavoritesScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    apiRequest<any>("/api/customer/favorites")
      .then((result) => {
        if (active) setItems(unwrapItems(result));
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load favorite professionals.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reload]);

  async function removeFavorite(id: string) {
    setBusy(id);
    setError("");
    try {
      await apiRequest(`/api/customer/favorites/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((item) => String(item._id || item.id) !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove professional from favorites.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Favorite Professionals"
        description="Quickly access and book your preferred fashion professionals and stylists."
        action={
          <Button variant="secondary" onClick={() => setReload((value) => value + 1)} loading={loading}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : items.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((fav: any) => {
            const id = String(fav._id || fav.id);
            const pro = fav.professional || fav;
            const name = pro.displayName || pro.name || "Professional";
            const rating = pro.ratingAverage ?? pro.rating;
            const reviewCount = pro.ratingCount || pro.reviewsCount || 0;
            const city = pro.city || pro.addressSnapshot?.city || "Location available";
            const category = pro.categories?.[0] || pro.category || pro.primaryService || "Fashion Specialist";
            const photo = pro.profilePhoto?.url || pro.profileImageUrl;

            return (
              <Card
                className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs flex flex-col justify-between space-y-3"
                key={id}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-300 font-bold text-sm grid place-items-center shrink-0 overflow-hidden">
                        {photo ? (
                          <img src={photo} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white truncate">{name}</h3>
                        <p className="text-[10px] text-gray-400 truncate">{category}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busy === id}
                      onClick={() => void removeFavorite(id)}
                      aria-label="Remove from favorites"
                      className="p-1.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50 shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800/80">
                    <div className="flex items-center gap-1 text-amber-500 font-bold shrink-0">
                      <Star size={13} fill="currentColor" />
                      <span>{rating == null ? "New" : Number(rating).toFixed(1)}</span>
                      <span className="text-gray-400 font-normal">({reviewCount})</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1 truncate">
                      <MapPin size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate">{city}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400">
                    {pro.experienceYears ? `${pro.experienceYears} yrs exp` : "Verified Pro"}
                  </span>
                  <Link
                    href={`/professionals/${pro.slug || pro._id || pro.id || id}`}
                    className="inline-flex items-center gap-1 rounded bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-700 transition"
                  >
                    Book Now <ArrowRight size={13} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="rounded p-8 text-center border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
          <EmptyState
            title="No favorite professionals yet"
            description="Explore our marketplace and tap the heart icon on any professional's profile to save them here."
            icon={<Heart size={22} />}
            action={
              <Link
                href="/professionals"
                className="inline-flex items-center gap-1.5 rounded bg-pink-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-pink-700 transition"
              >
                Find Professionals <ArrowRight size={13} />
              </Link>
            }
          />
        </Card>
      )}
    </div>
  );
}