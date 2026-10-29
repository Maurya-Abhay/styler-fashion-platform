import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { readJson } from "@/lib/api-utils";
import { parseOrThrow } from "@/lib/validation";
import { z } from "zod";
import { acceptBookingOffer } from "@/lib/booking";
const acceptSchema = z.object({
  quotePaise: z.number().int().min(100).max(Number.MAX_SAFE_INTEGER).optional(),
});
export const POST = withApi(async (request, context) => { const auth = await currentUser(request, ["professional"]); const { offerId } = await routeParams(context); requireId(offerId, "offerId"); const body = parseOrThrow(acceptSchema, await readJson(request)); return acceptBookingOffer({ offerId, professionalUserId: auth.userId, quotePaise: body.quotePaise }); });
