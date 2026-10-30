import { z } from "zod";

import Booking from "@/models/Booking";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, readJson, routeParams, requireId, withApi } from "@/lib/api-utils";
import { notifyUser } from "@/lib/notifications";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AppError } from "@/types";

const updateSchema = z.object({
  message: z.string().trim().min(3).max(300),
  etaMinutes: z.number().int().min(0).max(1440).optional(),
});

export const POST = withApi(async (request, context) => {
  const auth = await currentUser(request, ["professional"]);
  const { bookingId } = await routeParams(context);
  requireId(bookingId, "bookingId");
  const body = updateSchema.parse(await readJson(request));
  await enforceRateLimit({ key: `booking-update:${auth.userId}:${bookingId}`, limit: 6, windowMs: 60_000 });
  const profile = await ProfessionalProfile.findOne({
    userId: auth.userId,
    applicationStatus: "approved",
  }).select("_id").lean();
  if (!profile) throw new AppError("Professional approval is required.", 403, "PROFESSIONAL_NOT_APPROVED");

  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      professionalId: profile._id,
      status: { $in: ["confirmed", "in_progress"] },
    },
    { $push: { professionalUpdates: { $each: [{ ...body, createdAt: new Date() }], $slice: -50 } } },
    { new: true, runValidators: true },
  );
  if (!booking) throw new AppError("Only confirmed active bookings can receive arrival updates.", 409, "BOOKING_NOT_ACTIVE");

  await notifyUser({
    recipientUserId: String(booking.customerId),
    type: "booking_update",
    title: "Professional updated your booking",
    message: body.etaMinutes == null
      ? body.message
      : `${body.message} Estimated arrival: ${body.etaMinutes} minutes.`,
    channels: ["in_app", "email", "web_push"],
    data: { bookingId: String(booking._id) },
    dedupeKey: `professional-update:${String(booking._id)}:${String(booking.professionalUpdates[booking.professionalUpdates.length - 1]?._id)}`,
  }).catch((error) => {
    console.error("Unable to notify customer about a professional booking update", error);
  });

  return booking.professionalUpdates[booking.professionalUpdates.length - 1];
});
