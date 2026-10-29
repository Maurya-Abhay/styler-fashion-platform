import { Types } from "mongoose";
import Payment from "@/models/Payment";
import { currentUser, paginationFromRequest, withApi } from "@/lib/api-utils";

export const GET = withApi(async (request) => {
  const auth = await currentUser(request, ["customer"]);
  const { page, limit, skip } = paginationFromRequest(request);
  const customerId = new Types.ObjectId(auth.userId);
  const filter = { customerId };

  const [items, total, summary] = await Promise.all([
    Payment.find(filter)
      .select("bookingId provider razorpayOrderId razorpayPaymentId amountPaise currency status method capturedAt failureCode failureDescription refunds createdAt updatedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "bookingId", select: "serviceSnapshot startAt status" })
      .lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          paidPaise: {
            $sum: {
              $cond: [
                { $in: ["$status", ["captured", "partially_refunded", "refund_pending", "refunded"]] },
                "$amountPaise",
                0,
              ],
            },
          },
          pendingPayments: {
            $sum: { $cond: [{ $in: ["$status", ["created", "authorized"]] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    summary: summary[0] ?? { totalPayments: 0, paidPaise: 0, pendingPayments: 0 },
  };
});
