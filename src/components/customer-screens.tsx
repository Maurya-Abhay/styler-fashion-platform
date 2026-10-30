"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  BellRing,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  CreditCard,
  Heart,
  Languages,
  LocateFixed,
  LockKeyhole,
  MapPin,
  Monitor,
  Moon,
  Plus,
  Palette,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
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
import { uploadImageKit } from "@/components/imagekit-upload";
import { useTheme } from "@/components/theme-provider";

const AddressLocationMap = dynamic(
  () => import("@/components/address-location-map").then((module) => module.AddressLocationMap),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-panel bg-styler-surface-2" /> },
);

const ProfessionalBookingNavigation = dynamic(
  () => import("@/components/professional-booking-navigation").then((module) => module.ProfessionalBookingNavigation),
  { ssr: false, loading: () => <div className="h-72 animate-pulse rounded-panel bg-styler-surface-2" /> },
);

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
  const [stats, setStats] = useState<any>(null);
  const [monthlyPayments, setMonthlyPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    apiRequest<any>("/api/customer/dashboard")
      .then((result) => {
        if (!active) return;
        setMe(result.user);
        setBookings(result.bookings || []);
        setRequests(result.requests || []);
        setNotifications(result.notifications || []);
        setStats(result.stats);
        setMonthlyPayments(result.monthlyPayments || []);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const maxMonthlyPayment = Math.max(...monthlyPayments.map((item) => Number(item.amountPaise) || 0), 1);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title={`Good to see you${me?.name ? `, ${me.name.split(" ")[0]}` : ""}.`}
        description="Your appointments, requests and style plans — all in one place."
        action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setRefresh((value) => value + 1)} loading={loading}>
                <RefreshCw size={14} /> Refresh
              </Button>
              <Link
                href="/customer/bookings/new"
                className="inline-flex items-center gap-1.5 rounded bg-pink-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-pink-700 transition"
              >
                <Plus size={15} /> New Request
              </Link>
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3">
            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Active Bookings</span>
                <span className="p-1.5 rounded bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
                  <CalendarDays size={15} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
                {stats?.activeBookings ?? 0}
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
                {stats?.openRequests ?? 0}
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
                {stats?.totalBookings ?? 0}
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
                {stats?.unreadNotifications ?? 0}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-400">Booking & account alerts</div>
            </Card>
            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Completed Services</span>
                <span className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
                {stats?.completedBookings ?? 0}
              </div>
              <div className="mt-0.5 text-[10px] text-gray-400">Finished appointments</div>
            </Card>
            <Card className="rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Net Paid</span>
                <span className="p-1.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <CreditCard size={15} />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold font-serif text-gray-900 dark:text-white">
                {money(stats?.netPaidPaise ?? 0)}
              </div>
              <Link href="/customer/payments" className="mt-0.5 block text-[10px] text-pink-600 dark:text-pink-400 hover:underline">
                View payment history
              </Link>
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

                {bookings.length ? (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
                    {bookings.slice(0, 4).map((b: any) => (
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

              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 dark:text-white">Payment activity</h2>
                    <p className="text-[10px] text-gray-400">Net paid over the last six months</p>
                  </div>
                  <Link href="/customer/payments" className="text-xs font-semibold text-pink-600 dark:text-pink-400 hover:underline">
                    Receipts <ArrowRight size={12} className="inline" />
                  </Link>
                </div>
                <div className="mt-5 flex h-32 items-end gap-3">
                  {monthlyPayments.map((item) => {
                    const amount = Number(item.amountPaise) || 0;
                    const height = amount ? Math.max((amount / maxMonthlyPayment) * 100, 8) : 4;
                    return (
                      <div key={item.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="text-[9px] text-gray-500 dark:text-gray-400">{amount ? money(amount) : "—"}</span>
                        <div
                          className={`w-full max-w-8 rounded-t bg-gradient-to-t from-pink-600 to-pink-400 ${amount ? "" : "opacity-30"}`}
                          style={{ height: `${height}%` }}
                          title={`${item.label}: ${money(amount)}`}
                          role="img"
                          aria-label={`${item.label}: ${money(amount)} net paid`}
                        />
                        <span className="text-[9px] text-gray-400">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
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
  houseNumber?: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
};

export function BookingRequestForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState<any>(null);
  const [category, setCategory] = useState("lehenga_stitching");
  const [requirements, setRequirements] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [searchRadiusKm, setSearchRadiusKm] = useState(25);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [savedAddressLoading, setSavedAddressLoading] = useState(true);
  const [savedAddressError, setSavedAddressError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentPreference, setPaymentPreference] = useState<"when_accepted" | "later">("when_accepted");

  useEffect(() => {
    apiRequest<any>("/api/customer/addresses")
      .then((value) => {
        const addresses = unwrapItems(value);
        setSavedAddresses(addresses);
        setSelectedAddressId(
          String(addresses.find((address) => address.isDefault)?._id || addresses[0]?._id || ""),
        );
      })
      .catch((cause) => setSavedAddressError(cause instanceof Error ? cause.message : "Could not load saved addresses."))
      .finally(() => setSavedAddressLoading(false));
    const params = new URLSearchParams(window.location.search);
    if (params.get("service")) setCategory(params.get("service") || "lehenga_stitching");
  }, []);

  const selectedAddress = savedAddresses.find((address) => String(address._id) === selectedAddressId);
  const steps = [
    { number: 1, title: "Service details", description: "Choose the service and share details." },
    { number: 2, title: "Preferred time", description: "Time window professionals see in the offer." },
    { number: 3, title: "Service location", description: "Choose one of your saved addresses." },
    { number: 4, title: "Payment & review", description: "Review your request and payment preference." },
  ];

  function validateCurrentStep() {
    setError("");
    if (step === 1) {
      if (requirements.trim().length < 10) {
        setError("Please describe what you need in at least 10 characters.");
        return false;
      }
      if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
        setError("Minimum budget cannot be greater than maximum budget.");
        return false;
      }
    }
    if (step === 2) {
      const startAt = new Date(`${date}T${start}:00+05:30`);
      const endAt = new Date(`${date}T${end}:00+05:30`);
      if (!date || Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
        setError("Choose a date and time in the future.");
        return false;
      }
      if (Number.isNaN(endAt.getTime()) || endAt <= startAt) {
        setError("End time must be later than start time.");
        return false;
      }
    }
    if (step === 3) {
      if (!selectedAddress) {
        setError("Choose a saved address before continuing.");
        return false;
      }
      if (
        !selectedAddress.recipientName
        || !selectedAddress.phone
        || !selectedAddress.line1
        || !selectedAddress.city
        || !selectedAddress.state
      ) {
        setError("This saved address is incomplete. Edit it in Saved Addresses before booking.");
        return false;
      }
    }
    return true;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (step < 4) {
      if (validateCurrentStep()) setStep((current) => current + 1);
      return;
    }
    if (!validateCurrentStep()) return;
    setBusy(true);
    try {
      const startAt = new Date(`${date}T${start}:00+05:30`);
      const endAt = new Date(`${date}T${end}:00+05:30`);
      const payload = {
        serviceCategory: category,
        requirements,
        referenceImages: [],
        addressSnapshot: {
          recipientName: selectedAddress.recipientName,
          phone: selectedAddress.phone,
          houseNumber: selectedAddress.houseNumber || undefined,
          line1: selectedAddress.line1,
          line2: selectedAddress.line2 || undefined,
          landmark: selectedAddress.landmark || undefined,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.postalCode || undefined,
          country: selectedAddress.country || "India",
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        },
        searchRadiusKm,
        paymentPreference,
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
      const request = result?.request || result;
      const id = String(
        result?.requestId || result?.bookingRequestId || request?._id || request?.id || "",
      );
      setSubmitted({
        id,
        offersCreated: result?.matching?.offersCreated ?? request?.offersSentCount ?? 0,
        status: result?.matching?.status || request?.status || "matching",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit request.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title={submitted ? "Request sent" : "Create a booking request"}
        description={submitted
          ? "Your request is now being shared with suitable professionals."
          : "Complete four quick steps. Your request will be matched with suitable professionals."}
      />

      {submitted ? (
        <Card className="mx-auto max-w-2xl space-y-5 rounded-panel border border-styler-line bg-styler-surface p-6 text-center shadow-soft sm:p-10">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-styler-ink">Request shared successfully</h2>
            <p className="mt-2 text-sm leading-relaxed text-styler-muted">
              We&apos;re matching your request with approved professionals. You can follow responses and offers from your bookings.
            </p>
          </div>
          <div className="rounded-panel border border-styler-line bg-styler-canvas p-4 text-left">
            <p className="text-xs text-styler-muted">Request status</p>
            <p className="mt-1 font-semibold capitalize text-styler-ink">{humanize(submitted.status)}</p>
            <p className="mt-2 text-xs text-styler-muted">
              {submitted.offersCreated
                ? `${submitted.offersCreated} professional offer(s) sent so far.`
                : "We’ll keep looking for a suitable professional and update your bookings."}
            </p>
            <p className="mt-2 text-xs text-styler-muted">
              {paymentPreference === "when_accepted"
                ? "You chose to pay as soon as a professional accepts. Payment becomes available after acceptance."
                : "You chose to pay later. Pay securely from Bookings before the payment deadline."}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={submitted.id ? `/customer/bookings?request=${encodeURIComponent(submitted.id)}` : "/customer/bookings"}
              className="inline-flex items-center gap-2 rounded-sm bg-styler-accent px-5 py-3 text-sm font-semibold text-white hover:bg-styler-accent-strong"
            >
              Track my request <ArrowRight size={15} />
            </Link>
            <Button variant="secondary" onClick={() => window.location.assign("/customer/bookings/new")}>
              Create another request
            </Button>
          </div>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form onSubmit={submit} className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-4 gap-2" aria-label="Booking request progress">
            {steps.map((item) => (
              <button
                key={item.number}
                type="button"
                disabled={item.number > step}
                onClick={() => setStep(item.number)}
                aria-current={step === item.number ? "step" : undefined}
                className={`rounded-panel border p-3 text-left transition ${
                  step === item.number
                    ? "border-styler-accent bg-styler-accent-soft"
                    : step > item.number
                      ? "border-styler-line bg-styler-surface"
                      : "border-styler-line bg-styler-canvas opacity-60"
                }`}
              >
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                  step >= item.number ? "bg-styler-accent text-white" : "bg-styler-surface-2 text-styler-muted"
                }`}>
                  {item.number}
                </span>
                <span className="mt-2 block text-[11px] font-semibold text-styler-ink sm:text-xs">{item.title}</span>
              </button>
            ))}
          </div>

          <Card className="space-y-4 rounded-panel border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-6">
            <div className="flex items-center gap-3 border-b border-styler-line pb-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-styler-accent-soft text-xs font-bold text-styler-accent">
                0{step}
              </span>
              <div>
                <h2 className="text-base font-bold text-styler-ink">{steps[step - 1].title}</h2>
                <p className="text-xs text-styler-muted">{steps[step - 1].description}</p>
              </div>
            </div>

          {/* Step 1: Style Brief */}
          {step === 1 && (
            <div className="space-y-4">
              <SelectField
                label="Choose a service"
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
                placeholder="Share the occasion, style, fit, requirements or anything the professional should know."
                required
                minLength={10}
                maxLength={4000}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label="Minimum budget (₹, optional)"
                  type="number"
                  min="0"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Optional"
                />
                <Field
                  label="Maximum budget (₹, optional)"
                  type="number"
                  min="0"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Field
                label="Preferred date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10)}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Start time" type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
                <Field label="End time" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
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
              <p className="text-xs text-styler-muted">Professionals will see this preferred time window with your request.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {savedAddressLoading ? (
                <LoadingBlock label="Loading your saved addresses..." />
              ) : savedAddressError ? (
                <Alert tone="error">{savedAddressError}</Alert>
              ) : savedAddresses.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-styler-ink-soft">Select a saved address for this booking. You can manage addresses in your account.</p>
                  {savedAddresses.map((item) => {
                    const selected = String(item._id) === selectedAddressId;
                    return (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => setSelectedAddressId(String(item._id))}
                        aria-pressed={selected}
                        className={`w-full rounded-panel border p-4 text-left transition ${
                          selected ? "border-styler-accent bg-styler-accent-soft" : "border-styler-line bg-styler-canvas hover:border-styler-line-strong"
                        }`}
                      >
                        <span className="flex items-start gap-3">
                          <MapPin size={17} className="mt-0.5 shrink-0 text-styler-accent" />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <strong className="text-sm text-styler-ink">{item.label || "Saved address"}</strong>
                              {item.isDefault && <span className="rounded-full bg-styler-surface px-2 py-0.5 text-[10px] text-styler-muted">Default</span>}
                            </span>
                            <span className="mt-1 block text-xs text-styler-ink-soft">
                              {[item.recipientName, item.phone].filter(Boolean).join(" · ")}
                            </span>
                            <span className="mt-1 block whitespace-pre-line text-xs leading-relaxed text-styler-muted">
                              {[[item.houseNumber, item.line1].filter(Boolean).join(", "), item.line2, item.landmark, [item.city, item.state, item.postalCode].filter(Boolean).join(", "), item.country].filter(Boolean).join("\n")}
                            </span>
                            {Number.isFinite(item.latitude) && Number.isFinite(item.longitude) && (
                              <span className="mt-2 block font-mono text-[10px] text-styler-muted">
                                {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
                              </span>
                            )}
                          </span>
                          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                            selected ? "border-styler-accent bg-styler-accent text-white" : "border-styler-line-strong"
                          }`}>
                            {selected && <CheckCircle2 size={14} />}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  <Link href="/customer/addresses" className="inline-flex items-center gap-1 text-xs font-semibold text-styler-accent hover:underline">
                    Add or edit saved addresses <ArrowRight size={13} />
                  </Link>
                </div>
              ) : (
                <div className="rounded-panel border border-dashed border-styler-line-strong bg-styler-canvas p-6 text-center">
                  <MapPin size={24} className="mx-auto text-styler-accent" />
                  <h3 className="mt-3 font-semibold text-styler-ink">Save an address first</h3>
                  <p className="mt-1 text-sm text-styler-muted">To keep booking quick and accurate, choose a saved location. Add one using GPS or the map pin, then return here.</p>
                  <Link href="/customer/addresses" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-sm bg-styler-accent px-4 py-2.5 text-xs font-semibold text-white">
                    Manage saved addresses <ArrowRight size={14} />
                  </Link>
                </div>
              )}
              {selectedAddress && (
                <div className="rounded-panel bg-styler-canvas p-4 text-xs text-styler-muted">
                  Your exact saved location is included with the request and is shared with the professional only after they accept.
                </div>
              )}
            </div>
          )}

          {step === 4 && selectedAddress && (
            <div className="space-y-4">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-styler-ink">When would you like to pay?</legend>
                {([
                  ["when_accepted", "Pay as soon as a professional accepts", "Payment becomes available after an offer is accepted and the final amount is confirmed."],
                  ["later", "Pay later from Bookings", "Review the accepted offer and pay securely from Bookings before its payment deadline."],
                ] as const).map(([value, title, description]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer gap-3 rounded-panel border p-4 ${
                      paymentPreference === value ? "border-styler-accent bg-styler-accent-soft" : "border-styler-line bg-styler-canvas"
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentPreference"
                      value={value}
                      checked={paymentPreference === value}
                      onChange={() => setPaymentPreference(value)}
                      className="mt-1 accent-pink-600"
                    />
                    <span>
                      <span className="flex items-center gap-2 text-sm font-semibold text-styler-ink">
                        <CreditCard size={16} className="text-styler-accent" /> {title}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-styler-muted">{description}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="space-y-3 rounded-panel border border-styler-line bg-styler-canvas p-4">
                <h3 className="font-semibold text-styler-ink">Review your request</h3>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <p><span className="text-styler-muted">Service</span><strong className="mt-1 block text-styler-ink">{CATEGORIES.find((item) => item.slug === category)?.label || humanize(category)}</strong></p>
                  <p><span className="text-styler-muted">Preferred time</span><strong className="mt-1 block text-styler-ink">{date} · {start}–{end}</strong></p>
                  <p><span className="text-styler-muted">Location</span><strong className="mt-1 block text-styler-ink">{selectedAddress.label} · {selectedAddress.city}, {selectedAddress.state}</strong></p>
                  <p><span className="text-styler-muted">Budget</span><strong className="mt-1 block text-styler-ink">{budgetMin || budgetMax ? `₹${budgetMin || "0"} – ₹${budgetMax || "Flexible"}` : "Flexible"}</strong></p>
                </div>
                <p className="border-t border-styler-line pt-3 text-xs text-styler-muted">
                  No payment is taken when you send this request. Checkout opens only after a professional accepts and the price is known.
                </p>
              </div>
            </div>
          )}

          {error && <Alert tone="error">{error}</Alert>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-styler-line pt-4">
            <div>
              {step > 1 ? (
                <Button type="button" variant="secondary" onClick={() => { setError(""); setStep((current) => current - 1); }}>
                  Back
                </Button>
              ) : (
                <Link href="/customer/dashboard" className="inline-flex items-center rounded-sm border border-styler-line px-4 py-2.5 text-xs font-semibold text-styler-ink-soft">
                  Cancel
                </Link>
              )}
            </div>
            <Button
              loading={busy}
              type="submit"
              disabled={
                (step === 3 && (!selectedAddress || savedAddressLoading))
                || (step === 4 && !selectedAddress)
              }
            >
              {step < 4 ? <>Continue <ArrowRight size={14} /></> : <>Send request <ArrowRight size={14} /></>}
            </Button>
          </div>
          </Card>
        </form>

        {/* Side Info */}
        <div className="space-y-4">
          <Card className="space-y-3 rounded-panel border border-styler-line bg-styler-surface p-5 shadow-soft">
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
              <Sparkles size={18} />
              <span className="text-xs font-bold uppercase tracking-wider">Styler Match</span>
            </div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-white">Good style is a conversation.</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your request reaches suitable approved professionals. You&apos;ll see the offer and final price before you pay.
            </p>
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Clock3 size={14} className="text-pink-600 dark:text-pink-400 shrink-0" />
                <span>Compare responses in your bookings.</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-pink-600 dark:text-pink-400 shrink-0" />
                <span>Payment happens only after a professional accepts.</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
      )}
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
                      {b.paymentPreference === "later" ? "Pay before deadline" : "Pay securely now"} <CreditCard size={13} className="ml-1" />
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
  const [notice, setNotice] = useState("");
  const [updateMessage, setUpdateMessage] = useState("I'm on my way");
  const [etaMinutes, setEtaMinutes] = useState("20");
  const [actionBusy, setActionBusy] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const isProfessional = backHref.startsWith("/professional");
  const isCustomer = backHref.startsWith("/customer");

  const refreshBooking = useCallback(async (showLoading: boolean) => {
    if (showLoading) setLoading(true);
    try {
      const result = await apiRequest<any>(`/api/bookings/${id}`);
      setBooking(result);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load booking details.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);
  const bookingStatus = booking?.status;
  const paymentStatus = booking?.customerPayment?.status;

  useEffect(() => {
    let active = true;
    let refreshing = false;
    async function refresh(showLoading: boolean) {
      if (!active || refreshing) return;
      refreshing = true;
      await refreshBooking(showLoading);
      refreshing = false;
    }

    void refresh(true);
    const shouldPoll = !bookingStatus
      || ["pending_payment", "confirmed", "in_progress"].includes(bookingStatus)
      || (bookingStatus === "cancelled" && ["refund_pending", "partially_refunded"].includes(paymentStatus));
    const pollIntervalMs = bookingStatus === "cancelled" ? 30_000 : 5_000;
    const timer = shouldPoll
      ? window.setInterval(() => {
          if (!document.hidden) void refresh(false);
        }, pollIntervalMs)
      : null;
    const onVisibilityChange = () => {
      if (shouldPoll && !document.hidden) void refresh(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [id, refreshBooking, bookingStatus, paymentStatus]);

  async function sendProfessionalUpdate() {
    if (!updateMessage.trim()) return;
    setActionBusy("update");
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/professional/bookings/${id}/updates`, {
        method: "POST",
        body: JSON.stringify({
          message: updateMessage.trim(),
          ...(etaMinutes ? { etaMinutes: Number(etaMinutes) } : {}),
        }),
      });
      setNotice("Arrival update sent to the customer.");
      await refreshBooking(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send booking update.");
    } finally {
      setActionBusy("");
    }
  }

  async function advanceBooking(action: "start" | "complete") {
    setActionBusy(action);
    setError("");
    setNotice("");
    try {
      await apiRequest(`/api/bookings/${id}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice(action === "start" ? "Service marked as started." : "Service marked as complete.");
      await refreshBooking(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update booking status.");
    } finally {
      setActionBusy("");
    }
  }

  async function cancelCustomerBooking() {
    if (!isCustomer || !booking || !["pending_payment", "confirmed"].includes(booking.status)) return;
    const reason = window.prompt("Please tell us why you're cancelling (at least 3 characters).");
    if (!reason || reason.trim().length < 3) return;
    setActionBusy("cancel");
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<any>(`/api/bookings/${id}/cancel`, {
        method: "POST",
        headers: { "Idempotency-Key": `cancel:${id}` },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const messages: Record<string, string> = {
        pending: "Booking cancelled. Your refund request was sent to Razorpay; bank settlement can take several business days.",
        processed: "Booking cancelled. Razorpay has processed the refund; it may take several business days to appear in your account.",
        manual_review: "Booking cancelled. Styler support has been notified to review your refund.",
        not_eligible: "Booking cancelled. This payment is outside the configured refund window; contact Styler support if you believe this is incorrect.",
        not_applicable: "Booking cancelled successfully.",
      };
      setNotice(messages[result.refundStatus] || "Booking cancelled. Check the payment status below for refund updates.");
      await refreshBooking(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel booking.");
      await refreshBooking(false);
    } finally {
      setActionBusy("");
    }
  }

  async function submitBookingReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isCustomer || booking?.status !== "completed" || booking?.customerReview) return;
    setActionBusy("review");
    setError("");
    setNotice("");
    try {
      const customerReview = await apiRequest<any>("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          bookingId: String(booking._id),
          rating: reviewRating,
          comment: reviewComment.trim(),
        }),
      });
      setBooking((current: any) => ({
        ...current,
        customerReview,
        reviewId: customerReview._id,
      }));
      setNotice("Thank you — your review has been submitted.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit your review.");
    } finally {
      setActionBusy("");
    }
  }

  useEffect(() => {
    if (!isProfessional || !booking || window.location.hash !== "#booking-chat") return;
    const timer = window.setTimeout(
      () => document.getElementById("booking-chat")?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
    return () => window.clearTimeout(timer);
  }, [booking, isProfessional]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <PageHeading
        title="Your Appointment"
        description="Review the service details, schedule, location and status."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isCustomer && booking && ["pending_payment", "confirmed"].includes(booking.status) && (
              <Button
                variant="secondary"
                onClick={cancelCustomerBooking}
                loading={actionBusy === "cancel"}
              >
                Cancel booking
              </Button>
            )}
            <Link href={backHref} className="inline-flex items-center gap-1.5 rounded border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121620] px-3.5 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              Back to Bookings
            </Link>
          </div>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

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

            {isCustomer && booking.customerPayment && (
              <Card className="space-y-3 rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 dark:text-white">Payment & refund status</h2>
                    <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                      {booking.customerPayment.status === "captured"
                        || ["refund_pending", "partially_refunded", "refunded"].includes(booking.customerPayment.status)
                        ? "Paid through Razorpay"
                        : "Razorpay payment"}
                      {" · "}{money(booking.customerPayment.amountPaise)}
                    </p>
                  </div>
                  <StatusBadge status={booking.customerPayment.status} />
                </div>
                {booking.customerPayment.refunds?.length > 0 ? (
                  <div className="space-y-2">
                    {booking.customerPayment.refunds.map((refund: any, index: number) => (
                      <div key={`${refund.createdAt || index}-${index}`} className="rounded-lg bg-gray-50 p-3 dark:bg-[#121620]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <strong className="text-xs text-gray-900 dark:text-white">
                            {money(refund.amountPaise)} refund
                          </strong>
                          <StatusBadge status={refund.status} />
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                          {refund.status === "processed"
                            ? `Processed ${dateTime(refund.processedAt || refund.createdAt)}. Your bank may take several business days to post it.`
                            : refund.status === "failed"
                              ? refund.failureReason || "The payment provider could not process this refund. Contact Styler support."
                              : `Requested ${dateTime(refund.createdAt)}. Waiting for Razorpay and bank settlement.`}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : booking.customerPayment.status === "captured" ? (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {booking.status === "cancelled"
                      ? booking.refundReviewRequired
                        ? "Your cancellation refund is awaiting review by Styler support."
                        : booking.refundRequired
                          ? "Your cancellation qualifies for a refund, but the provider has not confirmed it yet. Contact Styler support if no refund update appears."
                          : "No automatic refund was initiated under the cancellation policy. Contact Styler support if you need help."
                      : booking.status === "pending_payment" || booking.status === "confirmed"
                        ? booking.customerCancellationPolicy?.refundMode === "manual_review"
                          ? "Cancellation refunds require Styler support review."
                          : booking.customerCancellationPolicy?.isWithinFreeCancellationWindow
                            ? "Cancel now to qualify for an automatic full refund under the current policy."
                            : "The automatic full-refund window has passed; cancellation may not qualify for a refund."
                        : "Your payment is captured."}
                  </p>
                ) : booking.status === "cancelled" && booking.refundReviewRequired ? (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Your cancellation refund is awaiting review by Styler support.
                  </p>
                ) : null}
                {booking.customerCancellationPolicy && ["pending_payment", "confirmed"].includes(booking.status) && (
                  <p className="border-t border-gray-100 pt-2 text-[10px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    Cancellation cutoff: at least {booking.customerCancellationPolicy.customerFreeCancellationMinutesBefore >= 60
                      ? `${(booking.customerCancellationPolicy.customerFreeCancellationMinutesBefore / 60).toFixed(booking.customerCancellationPolicy.customerFreeCancellationMinutesBefore % 60 ? 1 : 0)} hours`
                      : `${booking.customerCancellationPolicy.customerFreeCancellationMinutesBefore} minutes`} before the appointment.
                    {" "}Refund mode: {booking.customerCancellationPolicy.refundMode === "manual_review"
                      ? "support review"
                      : "automatic full refund before cutoff"}.
                  </p>
                )}
              </Card>
            )}

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
            {(isCustomer || isProfessional) && (
              <ProfessionalBookingNavigation
                bookingId={id}
                viewerRole={isProfessional ? "professional" : "customer"}
                destination={
                  Number.isFinite(booking.addressSnapshot?.latitude)
                    && Number.isFinite(booking.addressSnapshot?.longitude)
                    ? {
                        latitude: booking.addressSnapshot.latitude,
                        longitude: booking.addressSnapshot.longitude,
                      }
                    : null
                }
                addressLabel={[
                  booking.addressSnapshot?.line1,
                  booking.addressSnapshot?.line2,
                  booking.addressSnapshot?.city,
                  booking.addressSnapshot?.state,
                  booking.addressSnapshot?.postalCode,
                ].filter(Boolean).join(", ")}
                enabled={["confirmed", "in_progress"].includes(booking.status)}
                professionalLocation={
                  Number.isFinite(booking.professionalLiveLocation?.latitude)
                    && Number.isFinite(booking.professionalLiveLocation?.longitude)
                    ? {
                        latitude: booking.professionalLiveLocation.latitude,
                        longitude: booking.professionalLiveLocation.longitude,
                      }
                    : null
                }
                professionalLocationHistory={booking.professionalLocationHistory || []}
                professionalLocationStartedAt={booking.professionalLocationStartedAt || null}
                etaMinutes={
                  isCustomer && booking.professionalUpdates?.length
                    ? [...booking.professionalUpdates].reverse().find((item: any) => item.etaMinutes != null)?.etaMinutes ?? null
                    : null
                }
                etaUpdatedAt={
                  isCustomer && booking.professionalUpdates?.length
                    ? [...booking.professionalUpdates].reverse().find((item: any) => item.etaMinutes != null)?.createdAt ?? null
                    : null
                }
              />
            )}
            {isProfessional && ["confirmed", "in_progress"].includes(booking.status) && (
              <Card className="space-y-3 rounded p-4 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b]">
                <div>
                  <h2 className="text-xs font-bold text-gray-900 dark:text-white">Update the customer</h2>
                  <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                    Send an arrival ETA or a short service update. The customer receives an in-app notification.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
                  <input
                    value={updateMessage}
                    onChange={(event) => setUpdateMessage(event.target.value)}
                    maxLength={300}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none dark:border-gray-700 dark:bg-[#121620] dark:text-white"
                    placeholder="I'm on my way"
                  />
                  <select
                    value={etaMinutes}
                    onChange={(event) => setEtaMinutes(event.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-[#121620] dark:text-white"
                    aria-label="Estimated arrival time"
                  >
                    <option value="10">Arriving in 10 min</option>
                    <option value="20">Arriving in 20 min</option>
                    <option value="30">Arriving in 30 min</option>
                    <option value="45">Arriving in 45 min</option>
                    <option value="60">Arriving in 1 hour</option>
                    <option value="">No ETA</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={sendProfessionalUpdate} loading={actionBusy === "update"} disabled={!updateMessage.trim()}>
                    Send update
                  </Button>
                  {booking.status === "confirmed" && (
                    <Button variant="secondary" onClick={() => advanceBooking("start")} loading={actionBusy === "start"}>
                      Mark service started
                    </Button>
                  )}
                  {booking.status === "in_progress" && (
                    <Button variant="secondary" onClick={() => advanceBooking("complete")} loading={actionBusy === "complete"}>
                      Mark service complete
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-5">
            {/* Timeline */}
            <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
              <div className="border-b border-gray-100 dark:border-gray-800 pb-2">
                <h2 className="text-xs font-bold text-gray-900 dark:text-white">Booking Timeline</h2>
              </div>

              {(() => {
                const events = [
                  { status: "Request sent", at: booking.requestCreatedAt || booking.createdAt, note: "Your request was shared with matching professionals." },
                  ...(booking.statusHistory || []).map((item: any) => ({
                    status: item.status === "pending_payment" ? "Professional accepted" : humanize(item.status),
                    at: item.changedAt,
                    note: item.note,
                  })),
                  ...(booking.professionalUpdates || []).map((item: any) => ({
                    status: item.etaMinutes == null ? "Professional update" : `Arriving in ${item.etaMinutes} minutes`,
                    at: item.createdAt,
                    note: item.message,
                  })),
                ].sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());
                return events.length ? (
                <div className="space-y-3 text-xs border-l-2 border-gray-100 dark:border-gray-800 pl-3">
                  {events.map((s: any, i: number) => (
                    <div className="relative space-y-0.5" key={i}>
                      <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-pink-600" />
                      <strong className="block font-bold text-gray-900 dark:text-white">{s.status}</strong>
                      <span className="block text-[10px] text-gray-400">{dateTime(s.at)}</span>
                      {s.note && <p className="text-[11px] text-gray-500">{s.note}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No status history available yet.</p>
              );
              })()}
            </Card>

            {isCustomer && booking.status === "completed" && (
              <Card className="rounded p-5 border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1a1f2b] shadow-xs space-y-3">
                {booking.customerReview ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xs font-bold text-gray-900 dark:text-white">Your review</h2>
                        <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                          Thanks for sharing your experience with this professional.
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {dateTime(booking.customerReview.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1" aria-label={`${booking.customerReview.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          className={star <= booking.customerReview.rating ? "text-amber-400" : "text-gray-300 dark:text-gray-600"}
                          fill={star <= booking.customerReview.rating ? "currentColor" : "none"}
                        />
                      ))}
                      <strong className="ml-1 text-xs text-gray-900 dark:text-white">
                        {booking.customerReview.rating}/5
                      </strong>
                    </div>
                    {booking.customerReview.comment ? (
                      <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        {booking.customerReview.comment}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">You left a rating without a written comment.</p>
                    )}
                  </>
                ) : (
                  <form className="space-y-3" onSubmit={submitBookingReview}>
                    <div>
                      <h2 className="text-xs font-bold text-gray-900 dark:text-white">Rate your experience</h2>
                      <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        Your feedback helps other customers choose a professional.
                      </p>
                    </div>
                    <div className="flex items-center gap-1" role="group" aria-label="Choose a rating from 1 to 5 stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`${star} star${star === 1 ? "" : "s"}`}
                          aria-pressed={reviewRating === star}
                          onClick={() => setReviewRating(star)}
                          className="rounded p-1 text-amber-400 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                        >
                          <Star size={24} fill={star <= reviewRating ? "currentColor" : "none"} />
                        </button>
                      ))}
                      <span className="ml-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {reviewRating}/5
                      </span>
                    </div>
                    <label className="block space-y-1.5">
                      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                        Comment (optional)
                      </span>
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        maxLength={2000}
                        rows={4}
                        placeholder="What did you like about the service?"
                        className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-pink-400 dark:border-gray-700 dark:bg-[#121620] dark:text-white"
                      />
                    </label>
                    <Button type="submit" loading={actionBusy === "review"}>
                      Submit review <Star size={13} className="ml-1" />
                    </Button>
                  </form>
                )}
              </Card>
            )}

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
        <div id="booking-chat">
          <BookingChat bookingId={id} />
        </div>
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<any>({ name: "", phone: "", profileImageUrl: "" });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [preferenceBusy, setPreferenceBusy] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    apiRequest<any>("/api/customer/profile")
      .then((profile) => {
        setData(profile);
        setProfileDraft({
          name: profile.name || "",
          phone: profile.phone || "",
          profileImageUrl: profile.profileImageUrl || "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const v = await apiRequest<any>("/api/customer/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: profileDraft.name,
          phone: profileDraft.phone || "",
          profileImageUrl: profileDraft.profileImageUrl || "",
        }),
      });
      setData(v);
      setProfileDraft({
        name: v.name || "",
        phone: v.phone || "",
        profileImageUrl: v.profileImageUrl || "",
      });
      setNotice("Your profile has been saved.");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const uploaded = await uploadImageKit(file, "profile");
      setProfileDraft((current: any) => ({ ...current, profileImageUrl: uploaded.url }));
      setNotice("Photo uploaded. Save your profile to apply the change.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not upload your photo.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  async function saveNotificationPreference(key: "email" | "webPush", enabled: boolean) {
    setPreferenceBusy(key);
    setError("");
    setNotice("");
    try {
      const updated = await apiRequest<any>("/api/customer/profile", {
        method: "PATCH",
        body: JSON.stringify({ notificationPreferences: { [key]: enabled } }),
      });
      setData(updated);
      setNotice("Notification preferences updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update notification preferences.");
      throw cause;
    } finally {
      setPreferenceBusy("");
    }
  }

  async function togglePushNotifications(enabled: boolean) {
    setPreferenceBusy("webPush");
    setError("");
    setNotice("");
    let subscription: PushSubscription | null = null;
    try {
      if (enabled) {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
          throw new Error("Browser notifications are not supported by this browser.");
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Browser notification permission was not granted.");
        const config = await apiRequest<any>("/api/notifications/push-subscriptions");
        const registration = await navigator.serviceWorker.register("/sw.js");
        subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: decodeVapidKey(config.publicKey) as unknown as BufferSource,
          });
        }
        const json = subscription.toJSON();
        if (!json.keys?.p256dh || !json.keys?.auth) {
          throw new Error("Browser returned an incomplete push subscription.");
        }
        await apiRequest("/api/notifications/push-subscriptions", {
          method: "POST",
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: json.keys,
            expirationTime: json.expirationTime ?? null,
          }),
        });
        await saveNotificationPreference("webPush", true);
      } else {
        const updated = await apiRequest<any>("/api/customer/profile", {
          method: "PATCH",
          body: JSON.stringify({ notificationPreferences: { webPush: false } }),
        });
        setData(updated);
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration("/sw.js");
          subscription = await registration?.pushManager.getSubscription() ?? null;
          if (subscription) {
            await apiRequest("/api/notifications/push-subscriptions", {
              method: "DELETE",
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            await subscription.unsubscribe();
          }
        }
        setNotice("Browser notifications have been turned off.");
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not update browser notifications.";
      setError(message);
      if (enabled) throw cause;
    } finally {
      setPreferenceBusy("");
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordBusy(true);
    setError("");
    setNotice("");
    try {
      await apiRequest("/api/customer/change-password", {
        method: "POST",
        body: JSON.stringify(password),
      });
      setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordOpen(false);
      setNotice("Your password has been changed. Other active sessions were signed out.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change your password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  function chooseTheme(value: string) {
    if (value === "light" || value === "dark" || value === "system") setTheme(value);
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeading title="My Profile" description="Manage your personal information and account settings." />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      <Card className="rounded-panel border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-styler-accent-soft text-2xl font-bold text-styler-accent">
            {data?.profileImageUrl ? (
              <img src={data.profileImageUrl} alt={`${data.name}'s profile`} className="h-full w-full object-cover" />
            ) : (
              (data?.name || "S").slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-bold text-styler-ink">{data?.name || "Your account"}</h2>
            <p className="mt-1 truncate text-sm text-styler-muted">{data?.email}</p>
            <div className="mt-2">
              <StatusBadge status={data?.emailVerifiedAt ? "verified" : "pending"} />
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setProfileDraft({
                name: data?.name || "",
                phone: data?.phone || "",
                profileImageUrl: data?.profileImageUrl || "",
              });
              setEditing((current) => !current);
            }}
          >
            <UserRound size={15} className="mr-2" />
            {editing ? "Cancel editing" : "Edit profile"}
          </Button>
        </div>

        {editing && (
          <form onSubmit={saveProfile} className="mt-6 grid gap-4 border-t border-styler-line pt-5 sm:grid-cols-2">
            <div className="flex items-center gap-4 sm:col-span-2">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-styler-accent-soft text-xl font-bold text-styler-accent">
                {profileDraft.profileImageUrl ? (
                  <img src={profileDraft.profileImageUrl} alt="Profile preview" className="h-full w-full object-cover" />
                ) : (
                  (data?.name || "S").slice(0, 1).toUpperCase()
                )}
              </div>
              <div>
                <input
                  ref={imageInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={uploadProfilePhoto}
                />
                <Button type="button" variant="secondary" loading={uploading} onClick={() => imageInput.current?.click()}>
                  <Camera size={15} className="mr-2" />
                  {uploading ? "Uploading photo..." : "Change photo"}
                </Button>
                <p className="mt-1 text-xs text-styler-muted">JPG, PNG or WebP; up to 8 MB.</p>
              </div>
            </div>
            <Field
              label="Full name"
              value={profileDraft.name || ""}
              onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })}
              required
              minLength={2}
              maxLength={100}
            />
            <Field
              label="Mobile number"
              type="tel"
              value={profileDraft.phone || ""}
              onChange={(event) => setProfileDraft({ ...profileDraft, phone: event.target.value })}
              placeholder="+919876543210"
              help="Use international format, for example +919876543210."
            />
            <Field
              label="Email address"
              type="email"
              value={data?.email || ""}
              disabled
              help="Your verified email is used as your sign-in ID."
            />
            <div className="flex items-end justify-end">
              <Button loading={busy} type="submit" disabled={uploading}>
                Save profile <CheckCircle2 size={15} className="ml-2" />
              </Button>
            </div>
          </form>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-panel border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-6">
          <h2 className="text-lg font-bold text-styler-ink">Personal information</h2>
          <dl className="mt-4 divide-y divide-styler-line">
            <div className="py-4">
              <dt className="text-xs font-medium text-styler-muted">Full name</dt>
              <dd className="mt-1 text-sm font-semibold text-styler-ink">{data?.name || "Not set"}</dd>
            </div>
            <div className="py-4">
              <dt className="text-xs font-medium text-styler-muted">Email address</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-styler-ink">{data?.email || "Not set"}</dd>
            </div>
            <div className="py-4">
              <dt className="text-xs font-medium text-styler-muted">Mobile number</dt>
              <dd className="mt-1 text-sm font-semibold text-styler-ink">{data?.phone || "Not added yet"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="rounded-panel border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-6">
          <h2 className="text-lg font-bold text-styler-ink">Account settings</h2>
          <div className="mt-4 divide-y divide-styler-line">
            <div className="py-4">
              <button
                type="button"
                onClick={() => setPasswordOpen((current) => !current)}
                aria-expanded={passwordOpen}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-styler-surface-2 text-styler-ink-soft">
                  <LockKeyhole size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-styler-ink">Change password</span>
                  <span className="mt-0.5 block text-xs text-styler-muted">Update your account password</span>
                </span>
                {passwordOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
              </button>
              {passwordOpen && (
                <form onSubmit={changePassword} className="mt-4 space-y-3 pl-0 sm:pl-[52px]">
                  <Field
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    value={password.currentPassword}
                    onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })}
                    required
                  />
                  <Field
                    label="New password"
                    type="password"
                    autoComplete="new-password"
                    value={password.newPassword}
                    onChange={(event) => setPassword({ ...password, newPassword: event.target.value })}
                    minLength={8}
                    maxLength={128}
                    required
                    help="Use 8-128 characters without spaces."
                  />
                  <Field
                    label="Confirm new password"
                    type="password"
                    autoComplete="new-password"
                    value={password.confirmPassword}
                    onChange={(event) => setPassword({ ...password, confirmPassword: event.target.value })}
                    minLength={8}
                    maxLength={128}
                    required
                  />
                  <Button loading={passwordBusy} type="submit">Update password</Button>
                </form>
              )}
            </div>

            <div className="py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-styler-surface-2 text-styler-ink-soft">
                  <BellRing size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-styler-ink">Notification preferences</p>
                  <p className="mt-0.5 text-xs text-styler-muted">Choose how you receive account updates</p>
                </div>
              </div>
              <div className="mt-3 space-y-3 pl-0 sm:pl-[52px]">
                {([
                  ["email", "Email notifications", "Booking and account updates by email"],
                  ["webPush", "Browser notifications", "Alerts on this and other subscribed devices"],
                ] as const).map(([key, label, description]) => {
                  const enabled = data?.notificationPreferences?.[key] ?? true;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-styler-ink">{label}</p>
                        <p className="text-xs text-styler-muted">{description}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={label}
                        disabled={preferenceBusy === key}
                        onClick={() => {
                          if (key === "webPush") {
                            void togglePushNotifications(!enabled);
                          } else {
                            void saveNotificationPreference(key, !enabled).catch(() => undefined);
                          }
                        }}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                          enabled ? "bg-styler-accent" : "bg-styler-line-strong"
                        } ${preferenceBusy === key ? "cursor-wait opacity-60" : ""}`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                            enabled ? "left-[22px]" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 py-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-styler-surface-2 text-styler-ink-soft">
                <Languages size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-styler-ink">Language</p>
                <p className="mt-0.5 text-xs text-styler-muted">English</p>
              </div>
              <span className="rounded-full bg-styler-surface-2 px-3 py-1 text-xs font-medium text-styler-ink-soft">
                English
              </span>
            </div>

            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-styler-surface-2 text-styler-ink-soft">
                <Palette size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-styler-ink">Theme</p>
                <p className="mt-0.5 text-xs text-styler-muted">Choose light, dark or follow your device</p>
              </div>
              <label className="flex items-center gap-2">
                {theme === "light" ? <Sun size={15} /> : theme === "dark" ? <Moon size={15} /> : <Monitor size={15} />}
                <span className="sr-only">Theme preference</span>
                <select
                  value={theme}
                  onChange={(event) => chooseTheme(event.target.value)}
                  className="rounded-sm border border-styler-line bg-styler-surface px-3 py-2 text-sm text-styler-ink focus:outline-none focus:ring-2 focus:ring-styler-accent"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </div>
          </div>
        </Card>
      </div>
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
    houseNumber: "",
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
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [pinSelected, setPinSelected] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState("");
  const geocodeSequence = useRef(0);
  const mapCenter = {
    latitude: Number.isFinite(form.latitude) ? form.latitude : 20.5937,
    longitude: Number.isFinite(form.longitude) ? form.longitude : 78.9629,
  };

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

  async function fillAddressFromLocation() {
    setLocating(true);
    setLocationMessage("Requesting location permission...");
    try {
      const coordinates = await getCurrentCoordinates();
      setPinSelected(true);
      setForm((current: any) => ({
        ...current,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }));
      setLocationMessage("Location found. Looking up the address for this pin...");
    } catch (cause) {
      setLocationMessage(
        cause instanceof Error
          ? `${cause.message} You can still enter the address manually.`
          : "Could not look up your location. You can still enter the address manually.",
      );
    } finally {
      setLocating(false);
    }
  }

  useEffect(() => {
    if (!showForm || !pinSelected || !Number.isFinite(form.latitude) || !Number.isFinite(form.longitude)) {
      return;
    }

    const sequence = ++geocodeSequence.current;
    setLocationMessage("Finding address details for the selected pin...");
    const timeout = window.setTimeout(() => {
      void reverseGeocode({ latitude: form.latitude, longitude: form.longitude })
        .then((found) => {
          if (sequence !== geocodeSequence.current) return;
          setForm((current: any) => ({
            ...current,
            houseNumber: found.houseNumber || current.houseNumber,
            line1: found.street || found.line1 || current.line1,
            city: found.city || current.city,
            state: found.state || current.state,
            postalCode: found.postalCode || current.postalCode,
            country: found.country || current.country,
            latitude: found.latitude,
            longitude: found.longitude,
          }));
          setLocationMessage("Address updated from the map pin. Verify the details and add your building or entrance.");
        })
        .catch((cause) => {
          if (sequence !== geocodeSequence.current) return;
          setLocationMessage(
            `${cause instanceof Error ? cause.message : "Could not look up this pin."} You can still enter the address manually.`,
          );
        });
    }, 1_100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [form.latitude, form.longitude, pinSelected, showForm]);

  function openAddressForm() {
    setError("");
    setEditingAddressId("");
    setLocationMessage("");
    setPinSelected(false);
    setForm({
      label: "Home",
      recipientName: "",
      phone: "+91",
      houseNumber: "",
      line1: "",
      line2: "",
      landmark: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
      isDefault: items.length === 0,
      latitude: 20.5937,
      longitude: 78.9629,
    });
    setShowForm(true);
    void fillAddressFromLocation();
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        label: form.label,
        isDefault: form.isDefault,
        address: {
          recipientName: form.recipientName,
          phone: form.phone,
          houseNumber: form.houseNumber || undefined,
          line1: form.line1,
          line2: form.line2 || undefined,
          landmark: form.landmark || undefined,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          ...(pinSelected && Number.isFinite(form.latitude) && Number.isFinite(form.longitude)
            ? { latitude: form.latitude, longitude: form.longitude }
            : {}),
        },
      };
      await apiRequest(
        editingAddressId
          ? `/api/customer/addresses/${encodeURIComponent(editingAddressId)}`
          : "/api/customer/addresses",
        {
        method: editingAddressId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...payload,
        }),
      });
      setNotice(editingAddressId ? "Address updated." : "Address saved.");
      setShowForm(false);
      setEditingAddressId("");
      setForm({
        label: "Home",
        recipientName: "",
        phone: "+91",
        houseNumber: "",
        line1: "",
        line2: "",
        landmark: "",
        city: "",
        state: "Haryana",
        postalCode: "",
        country: "India",
        isDefault: false,
        latitude: 20.5937,
        longitude: 78.9629,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save address.");
    } finally {
      setBusy(false);
    }
  }

  function editAddress(address: any) {
    setError("");
    setEditingAddressId(String(address._id));
    setPinSelected(Number.isFinite(address.latitude) && Number.isFinite(address.longitude));
    setLocationMessage(
      Number.isFinite(address.latitude) && Number.isFinite(address.longitude)
        ? "Saved pin loaded. Drag it to update the location."
        : "This address has no saved pin. Choose a location on the map or use GPS.",
    );
    setForm({
      label: address.label || "Home",
      recipientName: address.recipientName || "",
      phone: address.phone || "",
      houseNumber: address.houseNumber || "",
      line1: address.line1 || "",
      line2: address.line2 || "",
      landmark: address.landmark || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
      country: address.country || "India",
      isDefault: Boolean(address.isDefault),
      latitude: Number.isFinite(address.latitude) ? address.latitude : 20.5937,
      longitude: Number.isFinite(address.longitude) ? address.longitude : 78.9629,
    });
    setShowForm(true);
  }

  function selectMapPin(coordinates: { latitude: number; longitude: number }) {
    setPinSelected(true);
    setForm((current: any) => ({ ...current, ...coordinates }));
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
        description="Save an address once for faster bookings."
        action={
          <Button onClick={() => (showForm ? setShowForm(false) : openAddressForm())}>
            <Plus size={15} className="mr-1" /> Add new address
          </Button>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {/* Add Address Collapsible Form */}
      {showForm && (
        <Card className="space-y-5 rounded-panel border border-styler-line bg-styler-surface p-5 shadow-soft sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-styler-ink">
              {editingAddressId ? "Edit address" : "Add a new address"}
            </h2>
            <p className="mt-1 text-sm text-styler-muted">Save your address once for faster bookings.</p>
          </div>

          <div className="rounded-panel border border-styler-line bg-styler-canvas p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-styler-accent-soft text-styler-accent">
                <LocateFixed size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-styler-ink">Choose your location</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    pinSelected
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-styler-surface-2 text-styler-ink-soft"
                  }`}>
                    {locating ? "Finding location..." : pinSelected ? "Pin selected" : "No pin selected"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-styler-muted">
                  Allow location access to fill your address and save its coordinates for booking directions.
                  Location is only requested here, not tracked continuously.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                loading={locating}
                onClick={() => void fillAddressFromLocation()}
              >
                <LocateFixed size={14} />
                Use current location
              </Button>
            </div>
            {locationMessage && (
              <p className={`mt-3 text-xs ${pinSelected ? "text-emerald-700 dark:text-emerald-300" : "text-styler-ink-soft"}`}>
                {locationMessage}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <AddressLocationMap
              coordinates={mapCenter}
              pinSelected={pinSelected}
              onChange={selectMapPin}
            />
            {pinSelected ? (
              <div className="grid gap-3 rounded-panel border border-styler-line bg-styler-canvas p-3 text-xs sm:grid-cols-2">
                <p className="flex items-center justify-between gap-2 text-styler-ink-soft">
                  <span>Latitude</span>
                  <strong className="font-mono text-styler-ink">{form.latitude.toFixed(6)}</strong>
                </p>
                <p className="flex items-center justify-between gap-2 text-styler-ink-soft">
                  <span>Longitude</span>
                  <strong className="font-mono text-styler-ink">{form.longitude.toFixed(6)}</strong>
                </p>
                <p className="text-styler-muted sm:col-span-2">
                  Street and area details are filled when OpenStreetMap has them. Building and entrance numbers may need to be entered manually.
                </p>
              </div>
            ) : (
              <p className="text-xs text-styler-muted">
                Move the map to your area and click to drop a pin, or allow GPS access to start near your current location.
              </p>
            )}
          </div>

          <form className="space-y-4" onSubmit={save}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Address label</span>
                <select
                  value={form.label}
                  onChange={(event) => setForm({ ...form, label: event.target.value })}
                  className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 focus:border-pink-500 focus:outline-none dark:border-gray-800 dark:bg-[#121620] dark:text-white"
                >
                  <option>Home</option>
                  <option>Office</option>
                  <option>Other</option>
                </select>
              </label>
              <Field label="Recipient name" value={form.recipientName} onChange={(event) => setForm({ ...form, recipientName: event.target.value })} required maxLength={100} />
              <Field label="Phone number" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+919876543210" required />
              <Field label="House / flat / building number" value={form.houseNumber} onChange={(event) => setForm({ ...form, houseNumber: event.target.value })} maxLength={100} />
              <Field label="Street / area / locality" value={form.line1} onChange={(event) => setForm({ ...form, line1: event.target.value })} required maxLength={200} />
              <Field label="Landmark (optional)" value={form.landmark} onChange={(event) => setForm({ ...form, landmark: event.target.value })} maxLength={150} />
              <Field label="Additional address details (optional)" value={form.line2} onChange={(event) => setForm({ ...form, line2: event.target.value })} maxLength={200} />
              <Field label="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required maxLength={100} />
              <Field label="State" value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required maxLength={100} />
              <Field label="PIN code (if available)" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} maxLength={12} />
              <Field label="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} required maxLength={100} />
            </div>

            {Number.isFinite(form.latitude) && Number.isFinite(form.longitude) && (
              <p className="flex items-center gap-2 text-xs text-styler-muted">
                <MapPin size={14} className="text-styler-accent" />
                Precise location captured. You can edit the address before saving.
              </p>
            )}

            <label className="flex items-center gap-2 pt-1 text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              />
              Set as default address
            </label>

            <div className="flex justify-end gap-2 border-t border-styler-line pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={busy} disabled={locating}>
                {editingAddressId ? "Update address" : "Save address"}
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
                    <span className="rounded bg-pink-50 p-1.5 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                      <MapPin size={15} />
                    </span>
                    <strong className="text-xs font-bold text-gray-900 dark:text-white">{a.label || "Saved Address"}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {a.isDefault && <StatusBadge status="default" />}
                    {Number.isFinite(a.latitude) && Number.isFinite(a.longitude) && (
                      <span title="Exact booking location saved" className="text-emerald-600 dark:text-emerald-400">
                        <LocateFixed size={14} />
                      </span>
                    )}
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
                    {[[a.houseNumber, a.line1].filter(Boolean).join(", "), a.line2, a.landmark, [a.city, a.state, a.postalCode].filter(Boolean).join(", "), a.country].filter(Boolean).join("\n")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-gray-800">
                <div>
                  <p className="text-[10px] text-gray-400">{a.phone}</p>
                  {Number.isFinite(a.latitude) && Number.isFinite(a.longitude) && (
                    <p className="mt-1 font-mono text-[9px] text-gray-400">
                      {a.latitude.toFixed(5)}, {a.longitude.toFixed(5)}
                    </p>
                  )}
                </div>
                <Button type="button" variant="secondary" onClick={() => editAddress(a)}>
                  <Pencil size={13} /> Edit
                </Button>
              </div>
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
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [d, unread] = await Promise.all([
        apiRequest<any>("/api/notifications?limit=50"),
        apiRequest<any>("/api/notifications?limit=1&unreadOnly=true"),
      ]);
      setItems(unwrapItems(d));
      setUnreadCount(Number(unread?.total) || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    let refreshing = false;
    const refresh = async (showLoading: boolean) => {
      if (!active || refreshing) return;
      refreshing = true;
      await load(showLoading);
      refreshing = false;
    };
    void refresh(true);
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh(false);
    }, 15_000);
    const onVisibilityChange = () => {
      if (!document.hidden) void refresh(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  async function read(n: any) {
    try {
      await apiRequest(`/api/notifications/${n._id}/read`, { method: "PATCH", body: JSON.stringify({}) });
      setItems((v) => v.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x)));
      if (!n.readAt) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update notification.");
    }
  }

  async function markAllRead() {
    setMarkingAllRead(true);
    setError("");
    setPushNotice("");
    try {
      await apiRequest("/api/notifications/read-all", { method: "PATCH", body: JSON.stringify({}) });
      const readAt = new Date().toISOString();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
      setUnreadOnly(true);
      setPushNotice("Unread notifications cleared. You can still view them under All.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not clear unread notifications.");
    } finally {
      setMarkingAllRead(false);
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
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => load()} loading={loading}>
              <RefreshCw size={14} className="mr-1" /> Refresh
            </Button>
            <Button variant="secondary" onClick={() => void markAllRead()} loading={markingAllRead} disabled={!unreadCount}>
              <CheckCircle2 size={14} className="mr-1" /> Clear unread
            </Button>
          </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-[#1a1f2b]" role="group" aria-label="Filter notifications">
          <button type="button" onClick={() => setUnreadOnly(false)} aria-pressed={!unreadOnly} className={`rounded px-3 py-1.5 text-[11px] font-semibold ${!unreadOnly ? "bg-pink-600 text-white" : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>
            All
          </button>
          <button type="button" onClick={() => setUnreadOnly(true)} aria-pressed={unreadOnly} className={`rounded px-3 py-1.5 text-[11px] font-semibold ${unreadOnly ? "bg-pink-600 text-white" : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>
            Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        </div>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {unreadCount ? `${unreadCount} unread in this list` : "You’re all caught up"}
        </span>
      </div>

      {/* Notifications List */}
      {loading ? (
        <LoadingBlock />
      ) : items.filter((item) => !unreadOnly || !item.readAt).length ? (
        <div className="space-y-2.5">
          {items.filter((item) => !unreadOnly || !item.readAt).map((n) => (
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