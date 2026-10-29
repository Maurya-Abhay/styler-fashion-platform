import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "@/types";
import Booking from "@/models/Booking";
import BookingRequest from "@/models/BookingRequest";
import Payment from "@/models/Payment";
import SlotReservation from "@/models/SlotReservation";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import User from "@/models/User";
import WebhookEvent from "@/models/WebhookEvent";
import FinancialLedger from "@/models/FinancialLedger";
import { notifyUser } from "@/lib/notifications";

const RAZORPAY_API_BASE = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured.");
  return { keyId, keySecret, authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` };
}

async function razorpayRequest<T>(path: string, init: { method?: string; body?: unknown; refundIdempotencyKey?: string } = {}): Promise<T> {
  const { authorization } = credentials();
  const headers: Record<string, string> = { Authorization: authorization, Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.refundIdempotencyKey) headers["X-Refund-Idempotency"] = init.refundIdempotencyKey;
  const response = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    method: init.method ?? "GET", headers,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let data: unknown;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text.slice(0, 1000) }; }
  if (!response.ok) {
    const message = (data as { error?: { description?: string; reason?: string } })?.error?.description || `Razorpay request failed (${response.status}).`;
    throw new AppError(message, response.status >= 500 ? 502 : 400, "RAZORPAY_API_ERROR", data);
  }
  return data as T;
}

export interface RazorpayOrder {
  id: string; entity: "order"; amount: number; amount_paid: number; amount_due: number;
  currency: string; receipt: string; status: string; notes?: Record<string, string>;
}
export interface RazorpayPayment {
  id: string; entity: "payment"; amount: number; currency: string; status: string;
  order_id?: string; method?: string; captured?: boolean; amount_refunded?: number;
}
export interface RazorpayRefund { id: string; entity: "refund"; amount: number; status: string; payment_id: string; }
export interface RazorpayTransfer { id: string; entity: "transfer"; amount: number; currency: string; recipient: string; transfer_status: string; settlement_status?: string; notes?: Record<string, string>; }

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder> {
  if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 100) throw new AppError("Payment amount must be at least ₹1.00 and expressed in paise.", 400, "INVALID_PAYMENT_AMOUNT");
  if (!input.receipt || input.receipt.length > 40) throw new AppError("Receipt must be 1–40 characters.", 400, "INVALID_RECEIPT");
  return razorpayRequest<RazorpayOrder>("/orders", {
    method: "POST", body: { amount: input.amountPaise, currency: "INR", receipt: input.receipt, notes: input.notes ?? {} },
  });
}

export function verifyCheckoutSignature(input: { orderId: string; paymentId: string; signature: string }): boolean {
  if (!input.orderId || !input.paymentId || !/^[a-f0-9]{64}$/i.test(input.signature)) return false;
  const { keySecret } = credentials();
  const expected = createHmac("sha256", keySecret).update(`${input.orderId}|${input.paymentId}`).digest();
  const actual = Buffer.from(input.signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyRazorpayWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const actual = Buffer.from(signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  if (!paymentId || paymentId.length > 200) throw new AppError("Invalid payment ID.", 400, "INVALID_PAYMENT_ID");
  return razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export async function issueRazorpayRefund(input: { paymentId: string; amountPaise?: number; reason?: string; notes?: Record<string, string>; idempotencyKey: string }): Promise<RazorpayRefund> {
  if (!input.idempotencyKey || input.idempotencyKey.length > 200) throw new AppError("A valid refund idempotency key is required.", 400, "INVALID_IDEMPOTENCY_KEY");
  if (input.amountPaise !== undefined && (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 1)) throw new AppError("Refund amount must be a positive integer number of paise.", 400, "INVALID_REFUND_AMOUNT");
  const body: Record<string, unknown> = { notes: { ...(input.notes ?? {}), reason: (input.reason ?? "Styler booking refund").slice(0, 256) } };
  if (input.amountPaise !== undefined) body.amount = input.amountPaise;
  return razorpayRequest<RazorpayRefund>(`/payments/${encodeURIComponent(input.paymentId)}/refund`, {
    method: "POST", body, refundIdempotencyKey: input.idempotencyKey,
  });
}

export async function fetchTransfersForPayment(paymentId: string): Promise<RazorpayTransfer[]> {
  const response = await razorpayRequest<{ entity?: string; items?: RazorpayTransfer[] }>(`/payments/${encodeURIComponent(paymentId)}/transfers`);
  return response.items ?? [];
}

export async function createRouteTransferFromPayment(input: {
  paymentId: string; linkedAccountId: string; amountPaise: number; payoutId: string;
  onHold?: boolean; onHoldUntil?: Date; notes?: Record<string, string>;
}): Promise<RazorpayTransfer> {
  if (!input.linkedAccountId || input.amountPaise < 100 || !Number.isSafeInteger(input.amountPaise)) {
    throw new AppError("Razorpay Route requires a linked account and a transfer of at least ₹1.00.", 400, "INVALID_TRANSFER");
  }
  const existing = await fetchTransfersForPayment(input.paymentId);
  const duplicate = existing.find((transfer) => transfer.notes?.styler_payout_id === input.payoutId);
  if (duplicate) return duplicate;
  const response = await razorpayRequest<{ items?: RazorpayTransfer[] }>(`/payments/${encodeURIComponent(input.paymentId)}/transfers`, {
    method: "POST",
    body: {
      transfers: [{
        account: input.linkedAccountId,
        amount: input.amountPaise,
        currency: "INR",
        on_hold: input.onHold ? 1 : 0,
        ...(input.onHoldUntil ? { on_hold_until: Math.floor(input.onHoldUntil.getTime() / 1000) } : {}),
        notes: { ...(input.notes ?? {}), styler_payout_id: input.payoutId.slice(0, 256) },
      }],
    },
  });
  const transfer = response.items?.[0];
  if (!transfer) throw new AppError("Razorpay did not return a transfer record.", 502, "TRANSFER_RESPONSE_MISSING");
  return transfer;
}

const ACTIVE_BOOKING_PAYMENT_STATUSES = [
  "created", "authorized", "captured", "refund_pending", "partially_refunded",
] as const;

function paymentOrderPayload(payment: any) {
  if (!payment?.razorpayOrderId) return null;
  return {
    paymentId: String(payment._id),
    orderId: payment.razorpayOrderId,
    amountPaise: Number(payment.amountPaise),
    currency: payment.currency,
    keyId: credentials().keyId,
  };
}

export async function createPaymentOrderForBooking(input: { bookingId: string; customerId: string }) {
  const booking = await Booking.findOne({
    _id: input.bookingId,
    customerId: input.customerId,
    status: "pending_payment",
    paymentDueAt: { $gt: new Date() },
  }).lean();
  if (!booking) throw new AppError("Booking is unavailable for payment or the payment window has expired.", 409, "BOOKING_NOT_PAYABLE");

  const amountPaise = Number(booking.priceSnapshot.totalPaise);
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
    throw new AppError("The booking total must be at least ₹1.00.", 400, "INVALID_PAYMENT_AMOUNT");
  }

  // Reuse the existing order instead of creating another chargeable order on refresh,
  // double-tap, or parallel checkout requests.
  let activePayment = await Payment.findOne({
    bookingId: booking._id,
    customerId: input.customerId,
    status: { $in: ACTIVE_BOOKING_PAYMENT_STATUSES },
  }).sort({ createdAt: -1 });

  if (activePayment) {
    if (Number(activePayment.amountPaise) !== amountPaise) {
      throw new AppError("An existing payment attempt has a different amount. Contact Styler support before retrying.", 409, "PAYMENT_AMOUNT_CHANGED");
    }
    if (activePayment.razorpayOrderId && ["created", "authorized"].includes(activePayment.status)) {
      return paymentOrderPayload(activePayment);
    }
    if (activePayment.status !== "created" || activePayment.razorpayOrderId) {
      throw new AppError("A payment has already been captured or is being reconciled. Do not start another payment; contact Styler support if the booking is not updated.", 409, "PAYMENT_ALREADY_IN_PROGRESS");
    }

    // Recover a request that crashed before saving the Razorpay order ID. Since the
    // customer never received an order ID, it is safe to retire this stale local attempt.
    const createdAt = new Date(activePayment.createdAt ?? 0).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt < 60_000) {
      throw new AppError("Your payment order is still being prepared. Please retry in a moment.", 409, "PAYMENT_ORDER_INITIALIZING");
    }
    const retired = await Payment.updateOne(
      { _id: activePayment._id, status: "created", razorpayOrderId: { $exists: false } },
      { $set: { status: "failed", failureDescription: "Local payment-order initialization expired before an order ID was saved." } },
    );
    if (!retired.modifiedCount) {
      throw new AppError("Your payment order is still being prepared. Please retry in a moment.", 409, "PAYMENT_ORDER_INITIALIZING");
    }
    activePayment = null;
  }

  let localPayment: any;
  try {
    localPayment = await Payment.create({
      bookingId: booking._id,
      customerId: input.customerId,
      amountPaise,
      currency: "INR",
      status: "created",
      idempotencyKey: `booking:${String(booking._id)}:${randomUUID()}`,
    });
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    // A concurrent checkout won the unique active-payment index. Reuse its order if
    // ready, otherwise return a controlled conflict rather than creating a second order.
    const winner = await Payment.findOne({
      bookingId: booking._id,
      customerId: input.customerId,
      status: { $in: ACTIVE_BOOKING_PAYMENT_STATUSES },
    }).sort({ createdAt: -1 });
    const payload = paymentOrderPayload(winner);
    if (payload && ["created", "authorized"].includes(winner.status)) return payload;
    throw new AppError("Your payment order is being prepared. Please retry shortly.", 409, "PAYMENT_ORDER_INITIALIZING");
  }

  try {
    const receipt = `styler_${String(localPayment._id)}`.slice(0, 40);
    const order = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: { bookingId: String(booking._id), paymentRecordId: String(localPayment._id) },
    });
    localPayment.razorpayOrderId = order.id;
    await localPayment.save();
    return paymentOrderPayload(localPayment);
  } catch (error) {
    localPayment.status = "failed";
    localPayment.failureDescription = (error instanceof Error ? error.message : "Unable to create payment order").slice(0, 1000);
    await localPayment.save().catch(() => undefined);
    throw error;
  }
}

async function recordCapturedPaymentLedger(payment: any, booking: any, session: mongoose.ClientSession) {
  const group = `payment:${String(payment._id)}:captured`;
  const alreadyRecorded = await FinancialLedger.findOne({ transactionGroupId: group }).session(session).lean();
  if (alreadyRecorded) return;
  const price = booking.priceSnapshot;
  const professionalPayable = Number(price.professionalPayoutPaise);
  const platformRevenue = Number(price.commissionPaise) + Number(price.customerPlatformFeePaise);
  const taxPayable = Number(price.taxPaise);
  const total = Number(price.totalPaise);
  const rows: Array<Record<string, unknown>> = [
    { accountCode: "cash_clearing", entrySide: "debit", entryType: "payment_captured", amountPaise: total, description: "Customer payment captured." },
  ];
  if (professionalPayable > 0) rows.push({ accountCode: "professional_payable", entrySide: "credit", entryType: "payment_captured", amountPaise: professionalPayable, description: "Amount payable to the professional." });
  if (platformRevenue > 0) rows.push({ accountCode: "platform_revenue", entrySide: "credit", entryType: "commission_earned", amountPaise: platformRevenue, description: "Platform commission and customer platform fee." });
  if (taxPayable > 0) rows.push({ accountCode: "tax_payable", entrySide: "credit", entryType: "payment_captured", amountPaise: taxPayable, description: "Tax collected for this booking." });
  const debits = rows.filter((row) => row.entrySide === "debit").reduce((sum, row) => sum + Number(row.amountPaise), 0);
  const credits = rows.filter((row) => row.entrySide === "credit").reduce((sum, row) => sum + Number(row.amountPaise), 0);
  if (debits !== credits) throw new AppError("Financial ledger entries do not balance.", 500, "LEDGER_UNBALANCED");
  await FinancialLedger.create(rows.map((row, index) => ({
    ...row,
    transactionGroupId: group,
    currency: "INR",
    bookingId: booking._id,
    paymentId: payment._id,
    idempotencyKey: `${group}:${index}`,
    occurredAt: new Date(),
  })), { session, ordered: true });
}

async function confirmCapturedPayment(paymentId: unknown, razorpayPayment: RazorpayPayment) {
  const session = await mongoose.startSession();
  let result: { bookingId: string; customerId: string; professionalUserId: string; confirmed: boolean } | null = null;
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(paymentId).session(session);
      if (!payment) throw new AppError("Local payment record not found.", 404, "PAYMENT_NOT_FOUND");
      const booking = await Booking.findById(payment.bookingId).session(session);
      if (!booking) throw new AppError("Booking not found for payment.", 404, "BOOKING_NOT_FOUND");
      if (payment.amountPaise !== razorpayPayment.amount || payment.currency !== razorpayPayment.currency) {
        throw new AppError("Razorpay payment amount or currency does not match the booking.", 400, "PAYMENT_AMOUNT_MISMATCH");
      }
      if (payment.razorpayPaymentId && payment.razorpayPaymentId !== razorpayPayment.id) {
        throw new AppError("This payment record is already associated with another Razorpay payment.", 409, "PAYMENT_ID_ALREADY_BOUND");
      }
      payment.razorpayPaymentId = razorpayPayment.id;
      payment.method = razorpayPayment.method;
      // A late or duplicate capture event (payment.captured + order.paid, retries, replays)
      // must never overwrite a refund state with "captured".
      if (["created", "authorized", "failed"].includes(payment.status)) payment.status = "captured";
      payment.capturedAt = payment.capturedAt ?? new Date();
      payment.lastProviderEventAt = new Date();
      await payment.save({ session });

      const now = new Date();
      const alreadyConfirmed = ["confirmed", "in_progress", "completed"].includes(booking.status);
      const canConfirm = booking.status === "pending_payment" && (!booking.paymentDueAt || booking.paymentDueAt > now);
      if (alreadyConfirmed) {
        result = { bookingId: String(booking._id), customerId: String(booking.customerId), professionalUserId: "", confirmed: true };
      } else if (canConfirm) {
        const confirmed = await Booking.updateOne(
          { _id: booking._id, status: "pending_payment", paymentDueAt: { $gt: now } },
          { $set: { status: "confirmed", confirmedAt: now }, $push: { statusHistory: { status: "confirmed", note: "Razorpay payment captured and verified.", changedAt: now } } },
          { session },
        );
        if (confirmed.modifiedCount) {
          await SlotReservation.updateMany(
            { bookingId: booking._id, status: "held" },
            { $set: { status: "confirmed" }, $unset: { expiresAt: 1 } },
            { session },
          );
          result = { bookingId: String(booking._id), customerId: String(booking.customerId), professionalUserId: "", confirmed: true };
        } else {
          result = { bookingId: String(booking._id), customerId: String(booking.customerId), professionalUserId: "", confirmed: false };
        }
      } else {
        result = { bookingId: String(booking._id), customerId: String(booking.customerId), professionalUserId: "", confirmed: false };
      }
      await recordCapturedPaymentLedger(payment, booking, session);
    });
  } finally { await session.endSession(); }
  const reconciled = result as unknown as { bookingId: string; customerId: string; professionalUserId: string; confirmed: boolean } | null;
  if (!reconciled) throw new AppError("Could not reconcile captured payment.", 500, "PAYMENT_RECONCILIATION_FAILED");
  const booking = await Booking.findById(reconciled.bookingId).select("professionalId").lean();
  if (booking) {
    const profile = await ProfessionalProfile.findById(booking.professionalId).select("userId").lean();
    if (profile) reconciled.professionalUserId = String(profile.userId);
  }
  if (reconciled.confirmed) {
    await Promise.allSettled([
      notifyUser({ recipientUserId: reconciled.customerId, type: "booking_confirmed", title: "Booking confirmed", message: "Your payment has been verified and your Styler booking is confirmed.", channels: ["in_app", "email"], data: { bookingId: reconciled.bookingId }, dedupeKey: `booking-confirmed-customer:${reconciled.bookingId}` }),
      ...(reconciled.professionalUserId ? [notifyUser({ recipientUserId: reconciled.professionalUserId, type: "booking_confirmed", title: "Booking confirmed", message: "Customer payment has been verified. Your Styler booking is confirmed.", channels: ["in_app", "email", "web_push"], data: { bookingId: reconciled.bookingId }, dedupeKey: `booking-confirmed-professional:${reconciled.bookingId}` })] : []),
    ]);
  } else {
    await notifyUser({ recipientUserId: reconciled.customerId, type: "payment_success", title: "Payment received — booking review needed", message: "The payment provider reports your payment as captured, but this booking could not be confirmed automatically. Styler support needs to review the payment and arrange a refund or resolution.", channels: ["in_app", "email"], data: { bookingId: reconciled.bookingId }, dedupeKey: `late-payment-review:${reconciled.bookingId}` }).catch(() => undefined);
  }
  return { ...reconciled, paymentStatus: "captured" as const, requiresManualReview: !reconciled.confirmed };
}

export async function verifyBookingPayment(input: {
  bookingId: string; customerId: string; orderId: string; paymentId: string; signature: string;
}) {
  if (!verifyCheckoutSignature({ orderId: input.orderId, paymentId: input.paymentId, signature: input.signature })) {
    throw new AppError("Payment signature verification failed.", 400, "INVALID_PAYMENT_SIGNATURE");
  }
  const localPayment = await Payment.findOne({ bookingId: input.bookingId, customerId: input.customerId, razorpayOrderId: input.orderId });
  if (!localPayment) throw new AppError("Payment order does not belong to this booking/customer.", 404, "PAYMENT_ORDER_NOT_FOUND");
  if (localPayment.status === "captured" && localPayment.razorpayPaymentId === input.paymentId) {
    const booking = await Booking.findById(input.bookingId).lean();
    return { bookingId: input.bookingId, confirmed: booking?.status === "confirmed" || booking?.status === "in_progress" || booking?.status === "completed", paymentStatus: "captured" as const, requiresManualReview: booking?.status !== "confirmed" && booking?.status !== "in_progress" && booking?.status !== "completed" };
  }
  const providerPayment = await fetchRazorpayPayment(input.paymentId);
  if (providerPayment.order_id !== input.orderId) throw new AppError("Payment is not associated with the expected Razorpay order.", 400, "PAYMENT_ORDER_MISMATCH");
  if (providerPayment.status !== "captured" && providerPayment.captured !== true) {
    if (providerPayment.status === "failed") {
      localPayment.status = "failed";
      localPayment.failureDescription = "Razorpay reported a failed payment.";
      await localPayment.save();
    }
    return { bookingId: input.bookingId, confirmed: false, paymentStatus: providerPayment.status, requiresManualReview: false };
  }
  localPayment.signatureVerifiedAt = new Date();
  await localPayment.save();
  return confirmCapturedPayment(localPayment._id, providerPayment);
}

export async function processRazorpayWebhook(input: { rawBody: string; signature: string; eventId?: string | null }) {
  if (!verifyRazorpayWebhookSignature(input.rawBody, input.signature)) throw new AppError("Invalid Razorpay webhook signature.", 401, "INVALID_WEBHOOK_SIGNATURE");
  let payload: any;
  try { payload = JSON.parse(input.rawBody); } catch { throw new AppError("Webhook payload is not valid JSON.", 400, "INVALID_WEBHOOK_PAYLOAD"); }
  const eventType = String(payload.event ?? "unknown");
  const eventId = input.eventId || createHash("sha256").update(input.rawBody).digest("hex");
  const payloadHash = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(input.rawBody).digest("hex");
  let eventRecord: any;
  try {
    eventRecord = await WebhookEvent.create({ provider: "razorpay", eventId, eventType, payloadHash, status: "received", receivedAt: new Date() });
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    const existing = await WebhookEvent.findOne({ provider: "razorpay", eventId });
    if (existing?.status === "processed") return { duplicate: true, processed: true, eventType };
    if (!existing) throw error;
    eventRecord = existing;
    eventRecord.status = "processing";
    eventRecord.attemptCount += 1;
    await eventRecord.save();
  }
  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const entity = payload.payload?.payment?.entity;
      const isCaptured = entity?.status === "captured" || entity?.captured === true;
      if (entity?.id && entity?.order_id && isCaptured) {
        const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
        if (payment) {
          const normalized: RazorpayPayment = {
            id: entity.id, entity: "payment", amount: Number(entity.amount), currency: entity.currency,
            status: entity.status, order_id: entity.order_id, method: entity.method, captured: entity.captured,
          };
          await confirmCapturedPayment(payment._id, normalized);
        }
      }
    } else if (eventType === "payment.failed") {
      const entity = payload.payload?.payment?.entity;
      if (entity?.id) {
        const payment = await Payment.findOne({ $or: [{ razorpayPaymentId: entity.id }, { razorpayOrderId: entity.order_id }], status: { $in: ["created", "authorized"] } });
        if (payment) {
          payment.status = "failed";
          payment.failureCode = entity.error_code;
          payment.failureDescription = entity.error_description;
          payment.lastProviderEventAt = new Date();
          await payment.save();
          await notifyUser({ recipientUserId: String(payment.customerId), type: "payment_failed", title: "Payment failed", message: "Razorpay could not complete the payment. You can retry while the payment window is open.", channels: ["in_app", "email"], data: { bookingId: String(payment.bookingId) }, dedupeKey: `payment-failed:${String(payment._id)}` });
        }
      }
    } else if (eventType.startsWith("refund.")) {
      const refundEntity = payload.payload?.refund?.entity;
      if (refundEntity?.id && refundEntity?.payment_id) {
        const payment = await Payment.findOne({ razorpayPaymentId: refundEntity.payment_id });
        if (payment) {
          const refund = payment.refunds.find((item: any) => item.razorpayRefundId === refundEntity.id);
          if (refund) {
            refund.status = refundEntity.status === "processed" ? "processed" : refundEntity.status === "failed" ? "failed" : "pending";
            if (refund.status === "processed") refund.processedAt = new Date();
            if (refund.status === "failed") refund.failureReason = String(refundEntity.error_reason ?? "Refund failed").slice(0, 1000);
          }
          const amounts = payment.refunds.filter((item: any) => ["pending", "processed"].includes(item.status)).reduce((sum: number, item: any) => sum + Number(item.amountPaise), 0);
          payment.status = payment.refunds.some((item: any) => item.status === "pending") ? "refund_pending" : amounts >= payment.amountPaise ? "refunded" : amounts > 0 ? "partially_refunded" : "captured";
          await payment.save();
          if (refund?.status === "processed") {
            // Lazy import avoids a top-level cycle: payout.ts uses Razorpay transfer helpers.
            const { recordProcessedRefundLedger } = await import("@/lib/payout");
            await recordProcessedRefundLedger({ paymentId: String(payment._id), razorpayRefundId: String(refundEntity.id) });
          }
        }
      }
    }
    eventRecord.status = "processed";
    eventRecord.processedAt = new Date();
    eventRecord.lastError = undefined;
    eventRecord.sanitizedSummary = { eventType, hasPayment: Boolean(payload.payload?.payment?.entity), hasRefund: Boolean(payload.payload?.refund?.entity) };
    await eventRecord.save();
    return { duplicate: false, processed: true, eventType };
  } catch (error) {
    eventRecord.status = "failed";
    eventRecord.lastError = (error instanceof Error ? error.message : "Webhook processing failed").slice(0, 2000);
    await eventRecord.save().catch(() => undefined);
    throw error;
  }
}

export interface RazorpayTransferReversal { id: string; entity: "reversal"; amount: number; transfer_id: string; status?: string; notes?: Record<string, string>; }

export async function reverseRazorpayRouteTransfer(input: { transferId: string; amountPaise?: number; notes?: Record<string, string>; idempotencyKey?: string }): Promise<RazorpayTransferReversal> {
  if (!input.transferId || input.transferId.length > 200) throw new AppError("Invalid Razorpay transfer ID.", 400, "INVALID_TRANSFER_ID");
  if (input.amountPaise !== undefined && (!Number.isSafeInteger(input.amountPaise) || input.amountPaise < 100)) {
    throw new AppError("Transfer reversal amount must be at least ₹1.00.", 400, "INVALID_REVERSAL_AMOUNT");
  }
  const notes = { ...(input.notes ?? {}), ...(input.idempotencyKey ? { styler_refund_key: input.idempotencyKey } : {}) };
  // Route reversals do not use the refund idempotency header. Check existing
  // reversals by our stable business reference before attempting a new reversal.
  if (input.idempotencyKey) {
    const existing = await razorpayRequest<{ items?: RazorpayTransferReversal[] }>(`/transfers/${encodeURIComponent(input.transferId)}/reversals`);
    const prior = (existing.items ?? []).find((item) => item.notes?.styler_refund_key === input.idempotencyKey);
    if (prior) return prior;
  }
  return razorpayRequest<RazorpayTransferReversal>(`/transfers/${encodeURIComponent(input.transferId)}/reversals`, {
    method: "POST",
    body: { ...(input.amountPaise !== undefined ? { amount: input.amountPaise } : {}), notes },
  });
}
