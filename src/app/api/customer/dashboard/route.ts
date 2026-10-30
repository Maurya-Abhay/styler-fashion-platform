import Booking from "@/models/Booking";
import BookingRequest from "@/models/BookingRequest";
import Notification from "@/models/Notification";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { currentUser, withApi } from "@/lib/api-utils";

export const GET = withApi(async (request) => {
  const auth = await currentUser(request, ["customer"]);
  const now = new Date();
  const monthParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now).map((part) => [part.type, part.value]));
  const monthIndex = Number(monthParts.month) - 1;
  const monthlyStartUtc = new Date(Date.UTC(Number(monthParts.year), monthIndex - 5, 1));
  const monthlyStart = new Date(monthlyStartUtc.getTime() - 330 * 60 * 1000);
  const activeStatuses = ["confirmed", "in_progress", "pending_payment"];
  const [user, totalBookings, activeBookings, upcomingBookings, completedBookings, openRequests, paidSummary, paymentTrend, bookings, requests, notifications, unreadNotifications] = await Promise.all([
    User.findById(auth.userId).select("name").lean(),
    Booking.countDocuments({ customerId: auth.userId }),
    Booking.countDocuments({
      customerId: auth.userId,
      status: { $in: activeStatuses },
      $or: [{ status: "in_progress" }, { startAt: { $gte: now } }],
    }),
    Booking.countDocuments({
      customerId: auth.userId,
      status: { $in: ["confirmed", "pending_payment"] },
      startAt: { $gte: now },
    }),
    Booking.countDocuments({ customerId: auth.userId, status: "completed" }),
    BookingRequest.countDocuments({ customerId: auth.userId, status: { $in: ["matching", "offers_sent"] } }),
    Payment.aggregate([
      { $match: { customerId: auth.userId, status: { $in: ["captured", "refund_pending", "partially_refunded", "refunded"] } } },
      {
        $group: {
          _id: null,
          paymentCount: { $sum: 1 },
          paidPaise: {
            $sum: {
              $max: [
                0,
                {
                  $subtract: [
                    "$amountPaise",
                    {
                      $reduce: {
                        input: { $ifNull: ["$refunds", []] },
                        initialValue: 0,
                        in: {
                          $add: [
                            "$$value",
                            { $cond: [{ $eq: ["$$this.status", "processed"] }, "$$this.amountPaise", 0] },
                          ],
                        },
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { customerId: auth.userId, status: { $in: ["captured", "refund_pending", "partially_refunded", "refunded"] }, capturedAt: { $gte: monthlyStart } } },
      {
        $project: {
          month: { $dateToString: { format: "%Y-%m", date: "$capturedAt", timezone: "Asia/Kolkata" } },
          netPaidPaise: {
            $max: [
              0,
              {
                $subtract: [
                  "$amountPaise",
                  {
                    $reduce: {
                      input: { $ifNull: ["$refunds", []] },
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          { $cond: [{ $eq: ["$$this.status", "processed"] }, "$$this.amountPaise", 0] },
                        ],
                      },
                    },
                  },
                ],
              },
            ],
          },
        },
      },
      { $group: { _id: "$month", amountPaise: { $sum: "$netPaidPaise" } } },
    ]),
    Booking.find({
      customerId: auth.userId,
      status: { $in: activeStatuses },
      $or: [{ status: "in_progress" }, { startAt: { $gte: now } }],
    })
      .sort({ startAt: 1 })
      .limit(5)
      .lean(),
    BookingRequest.find({ customerId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("serviceCategory addressSnapshot.city status createdAt")
      .lean(),
    Notification.find({ recipientUserId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(4)
      .select("title message type readAt createdAt data")
      .lean(),
    Notification.countDocuments({ recipientUserId: auth.userId, readAt: null }),
  ]);
  const trendByMonth = new Map(paymentTrend.map((item: any) => [item._id, Number(item.amountPaise)]));
  const monthlyPayments = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(Number(monthParts.year), monthIndex - (5 - index), 15, 12));
    const dateParts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date).map((part) => [part.type, part.value]));
    const month = `${dateParts.year}-${dateParts.month}`;
    return {
      month,
      label: new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" }).format(date),
      amountPaise: trendByMonth.get(month) ?? 0,
    };
  });
  return {
    user,
    stats: {
      totalBookings,
      activeBookings,
      upcomingBookings,
      completedBookings,
      openRequests,
      paymentCount: paidSummary[0]?.paymentCount ?? 0,
      netPaidPaise: paidSummary[0]?.paidPaise ?? 0,
      unreadNotifications,
    },
    monthlyPayments,
    bookings,
    requests,
    notifications,
  };
});
