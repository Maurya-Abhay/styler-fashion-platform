import Booking from "@/models/Booking";
import BookingRequest from "@/models/BookingRequest";
import User from "@/models/User";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Payment from "@/models/Payment";
import Payout from "@/models/Payout";
import FinancialLedger from "@/models/FinancialLedger";
import { currentUser, withApi } from "@/lib/api-utils";
import { getPlatformSettings } from "@/lib/commission";
export const GET = withApi(async (request) => {
  await currentUser(request, ["admin"]);
  const requestedDays = new URL(request.url).searchParams.get("days");
  const periodDays = requestedDays === "30" ? 30 : 7;
  const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const [users, customers, professionals, pendingApplications, bookings, pendingRequests, capturedPayments, pendingPayouts, ledgerRevenue, settings] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "customer" }),
    ProfessionalProfile.countDocuments({ applicationStatus: "approved" }),
    ProfessionalProfile.countDocuments({ applicationStatus: "pending_review" }),
    Booking.countDocuments(),
    BookingRequest.countDocuments({ status: { $in: ["matching", "offers_sent"] } }),
    Payment.aggregate([
      { $match: { status: { $in: ["captured", "partially_refunded", "refund_pending", "refunded"] }, createdAt: { $gte: periodStart } } },
      { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
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
  ]);
  return {
    users,
    customers,
    approvedProfessionals: professionals,
    pendingApplications,
    bookings,
    activeRequests: pendingRequests,
    periodDays,
    capturedPaymentVolumePaise: capturedPayments[0]?.totalPaise ?? 0,
    pendingPayoutPaise: pendingPayouts[0]?.totalPaise ?? 0,
    pendingPayoutCount: pendingPayouts[0]?.count ?? 0,
    platformRevenuePaise: ledgerRevenue[0]?.totalPaise ?? 0,
    settings,
  };
});
