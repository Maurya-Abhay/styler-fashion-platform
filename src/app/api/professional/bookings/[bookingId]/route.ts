import Booking from "@/models/Booking";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
export const GET = withApi(async (request, context) => { const auth = await currentUser(request, ["professional"]); const { bookingId } = await routeParams(context); requireId(bookingId, "bookingId"); const profile = await ProfessionalProfile.findOne({ userId: auth.userId }).select("_id").lean(); if (!profile) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND"); const booking = await Booking.findOne({ _id: bookingId, professionalId: profile._id }).lean(); if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND"); return booking; });
