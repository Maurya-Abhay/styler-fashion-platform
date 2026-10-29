import { z } from "zod";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { verifyBookingPayment } from "@/lib/razorpay";
const schema = z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i), orderId: z.string().min(1).max(200), paymentId: z.string().min(1).max(200), signature: z.string().regex(/^[a-f0-9]{64}$/i) });
export const POST = withApi(async (request) => { const auth = await currentUser(request, ["customer"]); const body = schema.parse(await readJson(request)); return verifyBookingPayment({ ...body, customerId: auth.userId }); });
