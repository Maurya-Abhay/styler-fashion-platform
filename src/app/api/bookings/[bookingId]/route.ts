import Booking from "@/models/Booking";
import BookingRequest from "@/models/BookingRequest";
import Payment from "@/models/Payment";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import Review from "@/models/Review";
import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
import { getPlatformSettings } from "@/lib/commission";
export const GET = withApi(async (request, context) => {
  const auth = await currentUser(request);
  const { bookingId } = await routeParams(context);
  requireId(bookingId, "bookingId");
  const filter: Record<string, unknown> = { _id: bookingId };
  if (auth.role === "customer") filter.customerId = auth.userId;
  if (auth.role === "professional") {
    const profile = await ProfessionalProfile.findOne({ userId: auth.userId }).select("_id").lean();
    if (!profile) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
    filter.professionalId = profile._id;
  }
  const booking = await Booking.findOne(filter).lean();
  if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  const bookingRequest = await BookingRequest.findById(booking.bookingRequestId).select("createdAt").lean();
  const result: Record<string, any> = {
    ...booking,
    requestCreatedAt: bookingRequest?.createdAt ?? booking.createdAt,
  };
  if (auth.role === "customer" && booking.status === "completed") {
    result.customerReview = await Review.findOne({
      bookingId: booking._id,
      customerId: auth.userId,
    }).select("rating comment createdAt").lean();
  }
  if (auth.role === "customer") {
    const settings = await getPlatformSettings();
    const customerFreeCancellationMinutesBefore = Number(
      settings.cancellationPolicy.customerFreeCancellationMinutesBefore,
    );
    result.customerCancellationPolicy = {
      customerFreeCancellationMinutesBefore,
      refundMode: settings.cancellationPolicy.refundMode,
      isWithinFreeCancellationWindow:
        (new Date(booking.startAt).getTime() - Date.now()) / 60_000 >= customerFreeCancellationMinutesBefore,
    };
    const payment = await Payment.findOne({
      bookingId: booking._id,
      customerId: auth.userId,
    })
      .select("amountPaise currency status refunds createdAt capturedAt")
      .sort({ createdAt: -1 })
      .lean();
    result.customerPayment = payment
      ? {
          amountPaise: payment.amountPaise,
          currency: payment.currency,
          status: payment.status,
          createdAt: payment.createdAt,
          capturedAt: payment.capturedAt,
          refunds: (payment.refunds ?? []).map((refund: any) => ({
            amountPaise: refund.amountPaise,
            status: refund.status,
            createdAt: refund.createdAt,
            processedAt: refund.processedAt,
            failureReason: refund.status === "failed" ? refund.failureReason : undefined,
          })),
        }
      : null;
  }
  const locationHistory = booking.professionalLocationHistory ?? [];
  let currentTripStartIndex = 0;
  for (let index = locationHistory.length - 1; index > 0; index -= 1) {
    const gap = new Date(locationHistory[index].sharedAt).getTime()
      - new Date(locationHistory[index - 1].sharedAt).getTime();
    if (gap > 2 * 60_000) {
      currentTripStartIndex = index;
      break;
    }
  }
  result.professionalLocationHistory = locationHistory.slice(currentTripStartIndex);
  if (currentTripStartIndex > 0) {
    result.professionalLocationStartedAt = locationHistory[currentTripStartIndex].sharedAt;
  } else if (!result.professionalLocationStartedAt && locationHistory.length > 0) {
    result.professionalLocationStartedAt = locationHistory[0].sharedAt;
  }
  if (auth.role === "professional") {
    if (booking.status === "pending_payment") result.addressSnapshot = undefined;
  } else if (auth.role === "customer") {
    const sharedAt = booking.professionalLiveLocation?.sharedAt;
    const isRecent = sharedAt && Date.now() - new Date(sharedAt).getTime() <= 2 * 60_000;
    if (!isRecent || !["confirmed", "in_progress"].includes(booking.status)) {
      result.professionalLiveLocation = undefined;
      result.professionalLocationStartedAt = undefined;
      result.professionalLocationHistory = [];
    }
  } else {
    result.professionalLiveLocation = undefined;
    result.professionalLocationStartedAt = undefined;
    result.professionalLocationHistory = [];
  }
  return result;
});
