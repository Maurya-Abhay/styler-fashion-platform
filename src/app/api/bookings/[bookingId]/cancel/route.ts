import Payment from "@/models/Payment";
import { currentUser, readJson, routeParams, requireId, withApi } from "@/lib/api-utils";
import { cancelBooking } from "@/lib/booking";
import { refundBookingPayment } from "@/lib/payout";
import { AppError } from "@/types";
import { z } from "zod";
const schema = z.object({ reason: z.string().trim().min(3).max(1000) });
export const POST = withApi(async (request, context) => { const auth = await currentUser(request, ["customer", "professional", "admin"]); const { bookingId } = await routeParams(context); requireId(bookingId, "bookingId"); const body = schema.parse(await readJson(request)); const result = await cancelBooking({ bookingId, actor: auth, reason: body.reason }); if (result.refundRequired) { const payment = await Payment.findById(result.paymentId).select("_id").lean(); if (payment) { const refund = await refundBookingPayment({ bookingId, paymentId: result.paymentId ?? undefined, reason: body.reason, requestedBy: auth.userId, idempotencyKey: `cancel:${bookingId}` }); return { ...result, refundStatus: (refund.refund as any)?.status ?? "pending" }; } throw new AppError("Refund was required but payment record could not be found; contact support.", 500, "REFUND_RECORD_MISSING"); } return { ...result, refundStatus: result.paymentId ? "manual_review_or_not_eligible" : "not_applicable" }; });
