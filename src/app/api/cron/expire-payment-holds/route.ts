export const maxDuration = 60;
import { withApi, assertCronSecret } from "@/lib/api-utils";
import { preservePendingPaymentBookings } from "@/lib/booking";
export const GET = withApi(async (request) => { assertCronSecret(request); return { updatedPaymentHolds: await preservePendingPaymentBookings() }; });
export const POST = GET;
