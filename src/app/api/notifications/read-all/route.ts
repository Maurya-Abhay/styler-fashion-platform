import Notification from "@/models/Notification";
import { currentUser, withApi } from "@/lib/api-utils";

export const PATCH = withApi(async (request) => {
  const auth = await currentUser(request);
  const result = await Notification.updateMany(
    { recipientUserId: auth.userId, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return { updatedCount: result.modifiedCount };
});
