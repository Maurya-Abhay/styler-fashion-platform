import mongoose from "mongoose";
import BookingRequest from "@/models/BookingRequest";
import BookingOffer from "@/models/BookingOffer";
import Booking from "@/models/Booking";
import Service from "@/models/Service";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import SlotReservation from "@/models/SlotReservation";
import Payment from "@/models/Payment";
import Availability from "@/models/Availability";
import { dispatchOffersForRequest } from "@/lib/matching";
import { calculatePriceBreakdown, getPlatformSettings } from "@/lib/commission";
import { isWindowAvailable, reserveWindowBlocks, releaseReservation } from "@/lib/availability";
import { notifyUser } from "@/lib/notifications";
import { createPayoutForCompletedBooking } from "@/lib/payout";
import { AppError, type AddressInput, type AuthenticatedUser } from "@/types";

export interface CreateBookingRequestInput {
  customerId: string;
  serviceCategory: string;
  requirements: string;
  referenceImages?: Array<{ fileId?: string; url: string; caption?: string }>;
  addressSnapshot: AddressInput;
  searchRadiusKm?: number;
  budgetMinPaise?: number;
  budgetMaxPaise?: number;
  preferredStartAt: Date;
  preferredEndAt: Date;
  requestedDurationMinutes?: number;
}

export function validateQuotePrice(
  quotePaise: unknown,
  budgetMinPaise?: number | null,
  budgetMaxPaise?: number | null,
) {
  if (typeof quotePaise !== "number" || !Number.isSafeInteger(quotePaise) || quotePaise < 100) {
    throw new AppError("Enter a quote of at least ₹1.00.", 400, "INVALID_QUOTE");
  }
  if (
    budgetMinPaise != null && quotePaise < budgetMinPaise
    || budgetMaxPaise != null && quotePaise > budgetMaxPaise
  ) {
    throw new AppError("Your quote must be within the customer's budget range.", 400, "QUOTE_OUTSIDE_BUDGET");
  }
  return quotePaise;
}

export async function createBookingRequest(input: CreateBookingRequestInput) {
  const start = new Date(input.preferredStartAt);
  const end = new Date(input.preferredEndAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new AppError("Choose a valid date and time window.", 400, "INVALID_TIME_WINDOW");
  }
  if (start <= new Date()) throw new AppError("Booking time must be in the future.", 400, "BOOKING_IN_PAST");
  if (input.requirements.trim().length < 10) throw new AppError("Please describe the service in at least 10 characters.", 400, "REQUIREMENTS_TOO_SHORT");
  if (input.budgetMinPaise != null && input.budgetMaxPaise != null && input.budgetMinPaise > input.budgetMaxPaise) {
    throw new AppError("Minimum budget cannot exceed maximum budget.", 400, "INVALID_BUDGET");
  }
  const settings = await getPlatformSettings();
  const request = await BookingRequest.create({
    customerId: input.customerId,
    serviceCategory: input.serviceCategory,
    requirements: input.requirements.trim(),
    referenceImages: input.referenceImages ?? [],
    addressSnapshot: { ...input.addressSnapshot, country: input.addressSnapshot.country ?? "India" },
    searchRadiusKm: input.searchRadiusKm ?? 25,
    budgetMinPaise: input.budgetMinPaise,
    budgetMaxPaise: input.budgetMaxPaise,
    preferredStartAt: start,
    preferredEndAt: end,
    requestedDurationMinutes: input.requestedDurationMinutes ?? 60,
    status: "matching",
    maxOffers: settings.maxOffersPerRequest,
    submittedAt: new Date(),
  });
  try {
    const matching = await dispatchOffersForRequest(String(request._id));
    return { request: await BookingRequest.findById(request._id).lean(), matching };
  } catch (error) {
    // The request is already durable. If dispatch had a transient failure, return
    // its current state so the scheduled matching worker can retry instead of
    // making the customer submit a duplicate request.
    const current = await BookingRequest.findById(request._id).lean().catch(() => null);
    if (current) {
      console.error("Booking request dispatch deferred", {
        requestId: String(request._id),
        status: current.status,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        request: current,
        matching: {
          requestId: String(request._id),
          offersCreated: Number(current.offersSentCount ?? 0),
          status: current.status,
          retryScheduled: current.status === "matching",
        },
      };
    }
    throw error;
  }
}

export async function acceptBookingOffer(input: {
  offerId: string;
  professionalUserId: string;
  quotePaise?: number;
}) {
  const session = await mongoose.startSession();
  let result: { bookingId: string; requestId: string; customerId: string; professionalId: string } | null = null;
  const now = new Date();
  try {
    await session.withTransaction(async () => {
      const profile = await ProfessionalProfile.findOne({ userId: input.professionalUserId, applicationStatus: "approved" }).session(session);
      if (!profile) throw new AppError("Only an approved professional can accept offers.", 403, "PROFESSIONAL_NOT_APPROVED");
      const offer = await BookingOffer.findOne({ _id: input.offerId, professionalId: profile._id, status: "sent", expiresAt: { $gt: now } }).session(session);
      if (!offer) throw new AppError("This offer has expired or is no longer available.", 409, "OFFER_NOT_AVAILABLE");
      const request = await BookingRequest.findOne({ _id: offer.bookingRequestId, status: "offers_sent", offerDeadlineAt: { $gt: now }, assignedOfferId: null }).session(session);
      if (!request) throw new AppError("Another professional already accepted this request, or the request expired.", 409, "REQUEST_ALREADY_ASSIGNED");
      const service = await Service.findOne({ _id: offer.serviceId, professionalId: profile._id, isActive: true }).session(session);
      if (!service) throw new AppError("The service is no longer active.", 409, "SERVICE_NOT_AVAILABLE");
      let servicePricePaise = Number(offer.quotedPricePaise);
      let customerFeePaise = Number(offer.customerFeePaise);
      let commissionPercent = Number(offer.commissionPercent);
      let commissionPaise = Number(offer.commissionPaise);
      let professionalPayoutPaise = Number(offer.professionalPayoutPaise);
      let settingsVersion = Number(offer.settingsVersion);
      if (service.pricingType === "quote_required") {
        servicePricePaise = validateQuotePrice(
          input.quotePaise,
          request.budgetMinPaise,
          request.budgetMaxPaise,
        );
        const breakdown = await calculatePriceBreakdown({
          servicePricePaise,
          professionalProfileId: String(profile._id),
        });
        customerFeePaise = breakdown.customerPlatformFeePaise;
        commissionPercent = breakdown.commissionPercent;
        commissionPaise = breakdown.commissionPaise;
        professionalPayoutPaise = breakdown.professionalPayoutPaise;
        settingsVersion = breakdown.settingsVersion;
      } else if (input.quotePaise !== undefined) {
        throw new AppError("A custom quote is not required for this service.", 400, "UNEXPECTED_QUOTE");
      }
      const availability = await Availability.findOne({ professionalId: profile._id }).session(session);
      if (!availability) throw new AppError("Your availability schedule is not configured.", 409, "AVAILABILITY_NOT_CONFIGURED");
      const startAt = new Date(offer.proposedStartAt);
      const endAt = new Date(offer.proposedEndAt);
      const bufferMinutes = Number(service.travelBufferMinutes ?? 15);
      const isAvailable = await isWindowAvailable({
        professionalId: String(profile._id), startAt, endAt, bufferMinutes,
        session, requireAccepting: false,
      });
      if (!isAvailable) throw new AppError("This time is no longer available. Please reject the offer so it can be retried.", 409, "SLOT_NO_LONGER_AVAILABLE");

      const winner = await BookingRequest.updateOne(
        { _id: request._id, status: "offers_sent", assignedOfferId: null, offerDeadlineAt: { $gt: now } },
        { $set: { status: "assigned", assignedOfferId: offer._id } },
        { session },
      );
      if (!winner.modifiedCount) throw new AppError("Another professional already accepted this request.", 409, "REQUEST_ALREADY_ASSIGNED");

      const settings = await getPlatformSettings();
      const paymentDueAt = new Date(now.getTime() + settings.paymentHoldMinutes * 60_000);
      const totalPaise = servicePricePaise + customerFeePaise;
      if (!Number.isSafeInteger(totalPaise) || totalPaise < 100) throw new AppError("The final price must be at least ₹1.00.", 400, "INVALID_BOOKING_PRICE");
      const [booking] = await Booking.create([{
        bookingRequestId: request._id,
        bookingOfferId: offer._id,
        customerId: request.customerId,
        professionalId: profile._id,
        serviceId: service._id,
        addressSnapshot: request.addressSnapshot,
        serviceSnapshot: {
          title: service.title, category: service.category, description: service.description,
          durationMinutes: service.durationMinutes, travelBufferMinutes: service.travelBufferMinutes,
        },
        priceSnapshot: {
          servicePricePaise,
          customerPlatformFeePaise: customerFeePaise,
          discountPaise: 0,
          taxPaise: 0,
          totalPaise,
          commissionPercent,
          commissionPaise,
          professionalPayoutPaise,
          currency: "INR",
          settingsVersion: settingsVersion || settings.settingsVersion,
        },
        startAt, endAt, status: "pending_payment", paymentDueAt,
        statusHistory: [{ status: "pending_payment", changedBy: input.professionalUserId, note: "Professional accepted the offer; awaiting customer payment.", changedAt: now }],
      }], { session });

      await reserveWindowBlocks({
        professionalId: String(profile._id), startAt, endAt, bufferMinutes,
        bookingRequestId: String(request._id), bookingOfferId: String(offer._id), bookingId: String(booking._id),
        expiresAt: paymentDueAt, session,
      });
      const accepted = await BookingOffer.updateOne({ _id: offer._id, status: "sent" }, { $set: { status: "accepted", respondedAt: now } }, { session });
      if (!accepted.modifiedCount) throw new AppError("Offer was processed by another request.", 409, "OFFER_RACE_CONDITION");
      await BookingOffer.updateMany(
        { bookingRequestId: request._id, _id: { $ne: offer._id }, status: "sent" },
        { $set: { status: "closed", respondedAt: now, closeReason: "Another professional accepted the request." } },
        { session },
      );
      await BookingRequest.updateOne({ _id: request._id }, { $set: { assignedBookingId: booking._id } }, { session });
      result = { bookingId: String(booking._id), requestId: String(request._id), customerId: String(request.customerId), professionalId: String(profile.userId) };
    });
  } finally {
    await session.endSession();
  }
  const assignedResult = result as unknown as { bookingId: string; requestId: string; customerId: string; professionalId: string } | null;
  if (!assignedResult) throw new AppError("Booking assignment could not be completed.", 500, "BOOKING_ASSIGNMENT_FAILED");
  await Promise.allSettled([
    notifyUser({ recipientUserId: assignedResult.customerId, type: "booking_offer_accepted", title: "A professional accepted your request", message: "Your request has been accepted. Complete payment before the checkout hold expires.", channels: ["in_app", "email"], data: { bookingId: assignedResult.bookingId }, dedupeKey: `booking-accepted-customer:${assignedResult.bookingId}` }),
    notifyUser({ recipientUserId: assignedResult.professionalId, type: "booking_offer_accepted", title: "You got the booking", message: "You accepted the request. The booking becomes confirmed after the customer payment is verified.", channels: ["in_app", "email", "web_push"], data: { bookingId: assignedResult.bookingId }, dedupeKey: `booking-accepted-professional:${assignedResult.bookingId}` }),
  ]);
  return Booking.findById(assignedResult.bookingId).lean();
}

export async function markBookingStarted(input: { bookingId: string; professionalUserId: string }) {
  const profile = await ProfessionalProfile.findOne({ userId: input.professionalUserId, applicationStatus: "approved" }).select("_id").lean();
  if (!profile) throw new AppError("Approved professional profile not found.", 403, "PROFESSIONAL_NOT_APPROVED");
  const now = new Date();
  const booking = await Booking.findOneAndUpdate(
    { _id: input.bookingId, professionalId: profile._id, status: "confirmed" },
    { $set: { status: "in_progress", startedAt: now }, $push: { statusHistory: { status: "in_progress", changedBy: input.professionalUserId, changedAt: now } } },
    { new: true, runValidators: true },
  );
  if (!booking) throw new AppError("Booking not found or it is not confirmed.", 409, "BOOKING_NOT_STARTABLE");
  await notifyUser({ recipientUserId: String(booking.customerId), type: "booking_started", title: "Your service has started", message: "Your Styler professional marked the service as started.", channels: ["in_app", "email"], data: { bookingId: String(booking._id) }, dedupeKey: `booking-started:${String(booking._id)}` });
  return booking;
}

export async function completeBooking(input: { bookingId: string; professionalUserId: string }) {
  const profile = await ProfessionalProfile.findOne({ userId: input.professionalUserId, applicationStatus: "approved" }).select("_id userId").lean();
  if (!profile) throw new AppError("Approved professional profile not found.", 403, "PROFESSIONAL_NOT_APPROVED");
  const now = new Date();
  const booking = await Booking.findOneAndUpdate(
    { _id: input.bookingId, professionalId: profile._id, status: "in_progress" },
    { $set: { status: "completed", completedAt: now }, $push: { statusHistory: { status: "completed", changedBy: input.professionalUserId, changedAt: now } } },
    { new: true, runValidators: true },
  );
  if (!booking) throw new AppError("Booking not found or it is not in progress.", 409, "BOOKING_NOT_COMPLETABLE");
  // Booking completion must remain successful even if payout provider/database
  // work is temporarily unavailable. The reconciliation cron below is idempotent.
  await createPayoutForCompletedBooking(String(booking._id)).catch((error) => {
    console.error("Payout creation deferred after booking completion", {
      bookingId: String(booking._id),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  });
  await Promise.allSettled([
    notifyUser({ recipientUserId: String(booking.customerId), type: "booking_completed", title: "Service completed", message: "Your Styler booking is complete. You can now leave a review.", channels: ["in_app", "email"], data: { bookingId: String(booking._id) }, dedupeKey: `booking-completed-customer:${String(booking._id)}` }),
    notifyUser({ recipientUserId: String(profile.userId), type: "booking_completed", title: "Booking completed", message: "The booking is marked complete. Your payout status will appear in earnings.", channels: ["in_app", "web_push"], data: { bookingId: String(booking._id) }, dedupeKey: `booking-completed-professional:${String(booking._id)}` }),
  ]);
  return booking;
}

export async function cancelBooking(input: { bookingId: string; actor: AuthenticatedUser; reason: string }) {
  const booking = await Booking.findById(input.bookingId);
  if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  let allowed = input.actor.role === "admin" || String(booking.customerId) === input.actor.userId;
  if (input.actor.role === "professional") {
    const profile = await ProfessionalProfile.findOne({ userId: input.actor.userId }).select("_id").lean();
    allowed = Boolean(profile && String(profile._id) === String(booking.professionalId));
  }
  if (!allowed) throw new AppError("You cannot cancel this booking.", 403, "FORBIDDEN");
  if (booking.status === "cancelled") {
    // Make cancellation safely retryable if the refund call failed after the
    // booking status was committed. Use the saved policy decision, not today's policy.
    if (booking.refundRequired) {
      const priorPayment = await Payment.findOne({
        bookingId: booking._id,
        razorpayPaymentId: { $exists: true, $ne: null },
      }).sort({ createdAt: -1 });
      if (priorPayment) {
        return {
          bookingId: String(booking._id),
          status: "cancelled" as const,
          refundRequired: true,
          paymentId: String(priorPayment._id),
        };
      }
      throw new AppError("A refund is required but the captured payment record is missing. Contact support.", 409, "REFUND_RECORD_MISSING");
    }
    // Compatibility with older records created before refundRequired was stored.
    const priorPayment = await Payment.findOne({
      bookingId: booking._id,
      razorpayPaymentId: { $exists: true, $ne: null },
    }).sort({ createdAt: -1 });
    const priorCancellationRefund = priorPayment?.refunds?.find((item: any) =>
      item.reason === (booking.cancellationReason ?? "")
      && ["pending", "failed", "processed"].includes(item.status),
    );
    if (priorPayment && priorCancellationRefund) {
      return { bookingId: String(booking._id), status: "cancelled" as const, refundRequired: true, paymentId: String(priorPayment._id) };
    }
    throw new AppError("This booking has already been cancelled.", 409, "BOOKING_NOT_CANCELLABLE");
  }
  if (!["pending_payment", "confirmed"].includes(booking.status)) throw new AppError("This booking can no longer be cancelled through the standard flow.", 409, "BOOKING_NOT_CANCELLABLE");
  const settings = await getPlatformSettings();
  const minutesBeforeStart = (booking.startAt.getTime() - Date.now()) / 60_000;
  const isCustomer = input.actor.role === "customer";
  if (input.actor.role === "professional" && !settings.cancellationPolicy.professionalCancellationAllowed) {
    throw new AppError("Professional cancellation is disabled by the current platform policy. Contact Styler support.", 403, "PROFESSIONAL_CANCELLATION_DISABLED");
  }
  const freeCancellation = !isCustomer || minutesBeforeStart >= settings.cancellationPolicy.customerFreeCancellationMinutesBefore;
  const payment = await Payment.findOne({ bookingId: booking._id, razorpayPaymentId: { $exists: true, $ne: null }, status: { $in: ["captured", "partially_refunded", "refund_pending"] } }).sort({ createdAt: -1 }).lean();
  const refundRequired = Boolean(payment?.status === "captured" && freeCancellation && settings.cancellationPolicy.refundMode === "full_before_cutoff");
  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await Booking.updateOne(
        { _id: booking._id, status: { $in: ["pending_payment", "confirmed"] } },
        { $set: { status: "cancelled", cancelledAt: now, cancelledBy: input.actor.userId, cancellationReason: input.reason.slice(0, 1000), refundRequired }, $push: { statusHistory: { status: "cancelled", changedBy: input.actor.userId, note: input.reason.slice(0, 500), changedAt: now } } },
        { session },
      );
      if (!updated.modifiedCount) throw new AppError("Booking status changed. Refresh and try again.", 409, "BOOKING_STATE_CHANGED");
      await releaseReservation(`${String(booking.bookingRequestId)}:${String(booking.bookingOfferId)}`, "released", session);
      await BookingRequest.updateOne({ _id: booking.bookingRequestId }, { $set: { status: "cancelled", cancelledAt: now } }, { session });
    });
  } finally { await session.endSession(); }
  await notifyUser({ recipientUserId: String(booking.customerId), type: "booking_cancelled", title: "Booking cancelled", message: refundRequired ? "Your booking was cancelled. A refund will be initiated according to the cancellation policy." : "Your booking was cancelled. If a refund applies, support/admin will review it.", channels: ["in_app", "email"], data: { bookingId: String(booking._id) }, dedupeKey: `booking-cancelled:${String(booking._id)}` });
  return { bookingId: String(booking._id), status: "cancelled", refundRequired, paymentId: payment ? String(payment._id) : null };
}

export async function expirePendingPaymentBookings(now = new Date()): Promise<number> {
  const dueBookings = await Booking.find({ status: "pending_payment", paymentDueAt: { $lte: now } }).select("_id bookingRequestId bookingOfferId customerId professionalId paymentDueAt").limit(500).lean();
  let expiredCount = 0;
  for (const due of dueBookings) {
    const session = await mongoose.startSession();
    let changed = false;
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findOneAndUpdate(
          { _id: due._id, status: "pending_payment", paymentDueAt: { $lte: now } },
          { $set: { status: "payment_failed" }, $push: { statusHistory: { status: "payment_failed", note: "Payment hold expired.", changedAt: now } } },
          { new: true, session },
        );
        if (!booking) return;
        await releaseReservation(`${String(due.bookingRequestId)}:${String(due.bookingOfferId)}`, "expired", session);
        await BookingRequest.updateOne({ _id: due.bookingRequestId, status: "assigned" }, { $set: { status: "expired", noMatchReason: "Customer payment deadline passed." } }, { session });
        await Payment.updateMany({ bookingId: due._id, status: { $in: ["created", "authorized"] } }, { $set: { status: "failed", failureDescription: "Customer payment deadline passed." } }, { session });
        changed = true;
      });
    } finally { await session.endSession(); }
    if (changed) {
      expiredCount++;
      await notifyUser({ recipientUserId: String(due.customerId), type: "payment_failed", title: "Payment window expired", message: "The payment window expired and the time slot was released. Please create a new request.", channels: ["in_app", "email"], data: { bookingId: String(due._id) }, dedupeKey: `payment-hold-expired:${String(due._id)}` }).catch((error) => console.error("Payment expiry notification failed", error));
    }
  }
  return expiredCount;
}
