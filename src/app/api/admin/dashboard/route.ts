import Booking from "@/models/Booking";
import BookingRequest from "@/models/BookingRequest";
import User from "@/models/User";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Payment from "@/models/Payment";
import Payout from "@/models/Payout";
import FinancialLedger from "@/models/FinancialLedger";
import { currentUser, withApi } from "@/lib/api-utils";
import { getPlatformSettings } from "@/lib/commission";

function istDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export const GET = withApi(async (request) => {
  await currentUser(request, ["admin"]);
  const requestedDays = new URL(request.url).searchParams.get("days");
  const periodDays = requestedDays === "30" ? 30 : 7;
  const now = new Date();
  const todayKey = istDateKey(now);
  const periodStart = new Date(`${todayKey}T00:00:00+05:30`);
  periodStart.setDate(periodStart.getDate() - (periodDays - 1));
  const [users, customers, professionals, pendingApplications, bookings, pendingRequests, capturedPayments, pendingPayouts, ledgerRevenue, settings, bookingStatusCounts, bookingTrend, revenueTrend, recentBookings] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "customer" }),
    ProfessionalProfile.countDocuments({ applicationStatus: "approved" }),
    ProfessionalProfile.countDocuments({ applicationStatus: "pending_review" }),
    Booking.countDocuments(),
    BookingRequest.countDocuments({ status: { $in: ["matching", "offers_sent"] } }),
    Payment.aggregate([
      { $match: { status: { $in: ["captured", "partially_refunded", "refund_pending"] }, capturedAt: { $gte: periodStart } } },
      { $group: { _id: null, totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
    ]),
    Payout.aggregate([
      { $match: { status: { $in: ["pending", "on_hold", "processing", "failed"] } } },
      { $group: { _id: null, totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
    ]),
    FinancialLedger.aggregate([
      { $match: { accountCode: "platform_revenue", entrySide: "credit", entryType: { $in: ["commission_earned", "platform_fee_earned"] }, createdAt: { $gte: periodStart } } },
      { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
    ]),
    getPlatformSettings(),
    Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { createdAt: { $gte: periodStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
    ]),
    FinancialLedger.aggregate([
      { $match: { accountCode: "platform_revenue", entrySide: "credit", entryType: { $in: ["commission_earned", "platform_fee_earned"] }, createdAt: { $gte: periodStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, amountPaise: { $sum: "$amountPaise" } } },
    ]),
    Booking.find().sort({ createdAt: -1 }).limit(5)
      .select("serviceSnapshot startAt status priceSnapshot createdAt")
      .populate({ path: "customerId", select: "name email" })
      .populate({ path: "professionalId", select: "displayName" })
      .lean(),
  ]);
  const bookingTrendByDay = new Map(bookingTrend.map((item: any) => [item._id, Number(item.count)]));
  const revenueTrendByDay = new Map(revenueTrend.map((item: any) => [item._id, Number(item.amountPaise)]));
  const trend = Array.from({ length: periodDays }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (periodDays - index - 1));
    date.setHours(12, 0, 0, 0);
    const key = istDateKey(date);
    return {
      date: key,
      bookings: bookingTrendByDay.get(key) ?? 0,
      revenuePaise: revenueTrendByDay.get(key) ?? 0,
    };
  });
  return {
    users,
    customers,
    approvedProfessionals: professionals,
    pendingApplications,
    bookings,
    activeRequests: pendingRequests,
    periodDays,
    capturedPaymentVolumePaise: capturedPayments[0]?.totalPaise ?? 0,
    capturedPaymentCount: capturedPayments[0]?.count ?? 0,
    pendingPayoutPaise: pendingPayouts[0]?.totalPaise ?? 0,
    pendingPayoutCount: pendingPayouts[0]?.count ?? 0,
    platformRevenuePaise: ledgerRevenue[0]?.totalPaise ?? 0,
    bookingStatusCounts: Object.fromEntries(bookingStatusCounts.map((item: any) => [item._id, item.count])),
    trend,
    recentBookings,
    settings,
  };
});
