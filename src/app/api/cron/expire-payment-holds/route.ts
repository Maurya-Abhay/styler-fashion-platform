export const maxDuration = 60;
import { withApi, assertCronSecret } from "@/lib/api-utils";
import { expirePendingPaymentBookings } from "@/lib/booking";
export const GET = withApi(async (request) => { assertCronSecret(request); return { expiredBookings: await expirePendingPaymentBookings() }; });
export const POST = GET;
