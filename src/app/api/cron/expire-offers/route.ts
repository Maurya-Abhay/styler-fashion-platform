export const maxDuration = 60;
import { withApi, assertCronSecret } from "@/lib/api-utils";
import { expireOldOffers } from "@/lib/matching";
export const GET = withApi(async (request) => { assertCronSecret(request); return { expiredRequests: await expireOldOffers() }; });
export const POST = GET;
