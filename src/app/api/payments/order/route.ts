import { z } from "zod";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { createPaymentOrderForBooking } from "@/lib/razorpay";
import { requireId } from "@/lib/api-utils";
const schema = z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i) });
export const POST = withApi(async (request) => { const auth = await currentUser(request, ["customer"]); const body = schema.parse(await readJson(request)); requireId(body.bookingId, "bookingId"); return createPaymentOrderForBooking({ bookingId: body.bookingId, customerId: auth.userId }); });
