import { currentUser, routeParams, requireId, withApi } from "@/lib/api-utils";
import { markNotificationRead } from "@/lib/notifications";
import { AppError } from "@/types";
export const PATCH = withApi(async (request, context) => { const auth = await currentUser(request); const { notificationId } = await routeParams(context); requireId(notificationId, "notificationId"); const notification = await markNotificationRead({ userId: auth.userId, notificationId }); if (!notification) throw new AppError("Notification not found.", 404, "NOTIFICATION_NOT_FOUND"); return notification; });
