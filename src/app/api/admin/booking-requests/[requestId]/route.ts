import BookingOffer from "@/models/BookingOffer";
import BookingRequest from "@/models/BookingRequest";
import { currentUser, readJson, routeParams, requireId, withApi, writeAudit } from "@/lib/api-utils";
import { notifyUser } from "@/lib/notifications";
import { AppError } from "@/types";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const PATCH = withApi(async (request, context) => {
  const admin = await currentUser(request, ["admin"]);
  const { requestId } = await routeParams(context);
  requireId(requestId, "requestId");
  const body = cancelSchema.parse(await readJson(request));
  const now = new Date();
  const item = await BookingRequest.findOneAndUpdate({
    _id: requestId,
    status: { $in: ["matching", "offers_sent"] },
  }, {
    $set: { status: "cancelled", cancelledAt: now },
  }, { new: true });
  if (!item) {
    throw new AppError("Only an active, unassigned request can be cancelled.", 409, "REQUEST_NOT_CANCELLABLE");
  }

  await BookingOffer.updateMany(
    { bookingRequestId: item._id, status: "sent" },
    { $set: { status: "closed", respondedAt: now, closeReason: body.reason } },
  );
  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action: "booking_request.cancelled",
    targetType: "BookingRequest",
    targetId: requestId,
    before: { status: "matching or offers_sent" },
    after: { status: "cancelled", reason: body.reason },
    request,
  });
  await notifyUser({
    recipientUserId: String(item.customerId),
    type: "booking_cancelled",
    title: "Booking request cancelled",
    message: "Styler support cancelled your unassigned booking request.",
    channels: ["in_app", "email"],
    data: { requestId },
    dedupeKey: `admin-request-cancelled:${requestId}`,
  });
  return { requestId, status: item.status };
});
