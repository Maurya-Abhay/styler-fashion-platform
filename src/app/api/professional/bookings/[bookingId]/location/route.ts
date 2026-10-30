import { z } from "zod";

import Booking from "@/models/Booking";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, readJson, routeParams, requireId, withApi } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AppError } from "@/types";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const PATCH = withApi(async (request, context) => {
  const auth = await currentUser(request, ["professional"]);
  const { bookingId } = await routeParams(context);
  requireId(bookingId, "bookingId");
  await enforceRateLimit({ key: `booking-live-location:${auth.userId}:${bookingId}`, limit: 8, windowMs: 60_000 });
  const coordinates = locationSchema.parse(await readJson(request));
  const profile = await ProfessionalProfile.findOne({
    userId: auth.userId,
    applicationStatus: "approved",
  }).select("_id").lean();
  if (!profile) throw new AppError("Professional approval is required.", 403, "PROFESSIONAL_NOT_APPROVED");

  const sharedAt = new Date();
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, professionalId: profile._id, status: { $in: ["confirmed", "in_progress"] } },
    {
      $set: { professionalLiveLocation: { ...coordinates, sharedAt } },
      $min: { professionalLocationStartedAt: sharedAt },
      $push: {
        professionalLocationHistory: {
          $each: [{ ...coordinates, sharedAt }],
          $slice: -120,
        },
      },
    },
    { new: true, projection: "_id professionalLiveLocation" },
  ).lean();
  if (!updated) throw new AppError("Live sharing is only available for confirmed active bookings.", 409, "BOOKING_NOT_ACTIVE");
  return updated.professionalLiveLocation;
});

export const DELETE = withApi(async (request, context) => {
  const auth = await currentUser(request, ["professional"]);
  const { bookingId } = await routeParams(context);
  requireId(bookingId, "bookingId");
  const profile = await ProfessionalProfile.findOne({ userId: auth.userId })
    .select("_id").lean();
  if (!profile) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  const updated = await Booking.findOneAndUpdate(
    { _id: bookingId, professionalId: profile._id },
    {
      $unset: {
        professionalLiveLocation: 1,
        professionalLocationStartedAt: 1,
        professionalLocationHistory: 1,
      },
    },
    { new: true, projection: "_id" },
  ).lean();
  if (!updated) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  return { sharing: false };
});
