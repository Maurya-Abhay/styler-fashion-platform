import Booking from "@/models/Booking";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
export const GET = withApi(async (request, context) => { const auth = await currentUser(request); const { bookingId } = await routeParams(context); requireId(bookingId, "bookingId"); const filter: Record<string, unknown> = { _id: bookingId }; if (auth.role === "customer") filter.customerId = auth.userId; if (auth.role === "professional") { const profile = await ProfessionalProfile.findOne({ userId: auth.userId }).select("_id").lean(); if (!profile) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND"); filter.professionalId = profile._id; } const booking = await Booking.findOne(filter).lean(); if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND"); return booking; });
