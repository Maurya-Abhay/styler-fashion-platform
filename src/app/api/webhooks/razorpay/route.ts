import { withApi } from "@/lib/api-utils";
import { processRazorpayWebhook } from "@/lib/razorpay";
import { AppError } from "@/types";
export const POST = withApi(async (request) => { const signature = request.headers.get("x-razorpay-signature") || ""; const eventId = request.headers.get("x-razorpay-event-id"); const rawBody = await request.text(); if (!rawBody || rawBody.length > 1_000_000) throw new AppError("Invalid webhook body.", 400, "INVALID_WEBHOOK_BODY"); return processRazorpayWebhook({ rawBody, signature, eventId }); });
