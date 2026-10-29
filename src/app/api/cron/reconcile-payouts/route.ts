export const maxDuration = 60;
import { withApi, assertCronSecret } from "@/lib/api-utils";
import { reconcileCompletedBookingPayouts } from "@/lib/payout";

export const GET = withApi(async (request) => {
  assertCronSecret(request);
  return reconcileCompletedBookingPayouts(100);
});

export const POST = GET;
