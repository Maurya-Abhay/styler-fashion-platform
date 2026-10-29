import { z } from "zod";
import ContactMessage from "@/models/ContactMessage";
import { currentUser, readJson, routeParams, requireId, withApi, writeAudit } from "@/lib/api-utils";
import { AppError } from "@/types";

const schema = z.object({
  status: z.enum(["new", "in_progress", "resolved"]),
});

export const PATCH = withApi(async (request, context) => {
  const admin = await currentUser(request, ["admin"]);
  const { messageId } = await routeParams(context);
  requireId(messageId, "messageId");
  const body = schema.parse(await readJson(request));
  const message = await ContactMessage.findById(messageId);
  if (!message) throw new AppError("Contact message not found.", 404, "CONTACT_MESSAGE_NOT_FOUND");
  const previousStatus = message.status;
  message.status = body.status;
  await message.save();
  await writeAudit({
    actorUserId: admin.userId,
    actorRole: "admin",
    action: "contact_message.status_changed",
    targetType: "ContactMessage",
    targetId: messageId,
    before: { status: previousStatus },
    after: { status: body.status },
    request,
  });
  return message;
});
