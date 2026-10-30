import { currentUser, readJson, paginationFromRequest, withApi } from "@/lib/api-utils";
import { bookingRequestSchema, parseOrThrow } from "@/lib/validation";
import { createBookingRequest } from "@/lib/booking";
import BookingRequest from "@/models/BookingRequest";
import { notifyAdmins } from "@/lib/notifications";
import { AppError } from "@/types";
export const GET = withApi(async (request) => { const auth = await currentUser(request, ["customer", "admin"]); const { page, limit, skip } = paginationFromRequest(request); const url = new URL(request.url); const filter: Record<string, any> = auth.role === "admin" ? {} : { customerId: auth.userId }; if (url.searchParams.get("status")) filter.status = url.searchParams.get("status"); const [items, total] = await Promise.all([BookingRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), BookingRequest.countDocuments(filter)]); return { items, page, limit, total, totalPages: Math.ceil(total / limit) }; });
export const POST = withApi(async (request) => {
  const auth = await currentUser(request, ["customer"]);
  const body = parseOrThrow(bookingRequestSchema, await readJson(request));
  const result = await createBookingRequest({ customerId: auth.userId, ...body });
  if (result.request?._id) {
    await notifyAdmins({
      type: "system_message",
      title: "New customer service request",
      message: `${body.serviceCategory.replaceAll("_", " ")} request received for ${body.addressSnapshot.city}, ${body.addressSnapshot.state}.`,
      data: { requestId: String(result.request._id) },
      dedupeKey: `admin-new-request:${String(result.request._id)}`,
    }).catch((error) => console.error("Unable to notify admins about a new request", error));
  }
  return result;
});
