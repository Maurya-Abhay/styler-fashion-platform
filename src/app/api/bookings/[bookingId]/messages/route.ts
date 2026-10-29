import { z } from "zod";
import Booking from "@/models/Booking";
import ChatMessage from "@/models/ChatMessage";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { currentUser, readJson, routeParams, requireId, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
import { enforceRateLimit } from "@/lib/rate-limit";

const messageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

async function getParticipantBooking(request: Request, bookingId: string) {
  const auth = await currentUser(request, ["customer", "professional"]);
  const booking = await Booking.findById(bookingId)
    .select("_id customerId professionalId status")
    .lean();
  if (!booking) throw new AppError("Booking not found.", 404, "BOOKING_NOT_FOUND");

  let isParticipant = false;
  if (auth.role === "customer") {
    isParticipant = String(booking.customerId) === auth.userId;
  } else {
    const profile = await ProfessionalProfile.findOne({ userId: auth.userId })
      .select("_id")
      .lean();
    isParticipant = Boolean(profile && String(booking.professionalId) === String(profile._id));
  }
  if (!isParticipant) {
    throw new AppError("Only this booking's customer and professional can access its chat.", 403, "FORBIDDEN");
  }

  return { auth, booking };
}

export const GET = withApi(async (request, context) => {
  const { bookingId } = await routeParams(context);
  requireId(bookingId, "bookingId");
  const { auth, booking } = await getParticipantBooking(request, bookingId);
  const messages = await ChatMessage.find({ bookingId: booking._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({ path: "senderUserId", select: "name role" })
    .lean();
  return {
    items: messages.reverse(),
    currentUserId: auth.userId,
    canSend: ["pending_payment", "confirmed", "in_progress"].includes(booking.status),
  };
});

export const POST = withApi(async (request, context) => {
  const { bookingId } = await routeParams(context);
  requireId(bookingId, "bookingId");
  const { auth, booking } = await getParticipantBooking(request, bookingId);
  if (!["pending_payment", "confirmed", "in_progress"].includes(booking.status)) {
    throw new AppError("Chat is available after acceptance while the booking is active.", 409, "CHAT_CLOSED");
  }
  await enforceRateLimit({ key: `chat:${auth.userId}`, limit: 30, windowMs: 60_000 });
  const { body } = messageSchema.parse(await readJson(request));
  const message = await ChatMessage.create({
    bookingId: booking._id,
    senderUserId: auth.userId,
    senderRole: auth.role,
    body,
  });
  return message;
});
