import { currentUser, paginationFromRequest, withApi } from "@/lib/api-utils";
import { listNotifications } from "@/lib/notifications";
export const GET = withApi(async (request) => { const auth = await currentUser(request); const url = new URL(request.url); const { page, limit } = paginationFromRequest(request); return listNotifications(auth.userId, { page, limit, unreadOnly: url.searchParams.get("unreadOnly") === "true" }); });
