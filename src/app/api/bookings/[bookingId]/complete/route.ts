import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { completeBooking } from "@/lib/booking";
export const POST = withApi(async (request, context) => { const auth = await currentUser(request, ["professional"]); const { bookingId } = await routeParams(context); requireId(bookingId, "bookingId"); return completeBooking({ bookingId, professionalUserId: auth.userId }); });
