import { z } from "zod";
import { withApi, readJson } from "@/lib/api-utils";
import { parseOrThrow } from "@/lib/validation";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendContactFormEmail } from "@/lib/zeptomail";
import ContactMessage from "@/models/ContactMessage";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.string().trim().min(3).max(150).default("General enquiry"),
  message: z.string().trim().min(10).max(3000),
});

export const POST = withApi(async (request) => {
  const ip = (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 64);
  await enforceRateLimit({ key: `contact:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  const body = parseOrThrow(schema, await readJson(request));
  const message = await ContactMessage.create({
    ...body,
    subject: body.subject || "General enquiry",
    status: "new",
    emailDeliveryStatus: "pending",
  });
  try {
    await sendContactFormEmail({ ...body, subject: body.subject || "General enquiry" });
    await ContactMessage.updateOne(
      { _id: message._id },
      { $set: { emailDeliveryStatus: "sent" }, $unset: { emailDeliveryError: 1 } },
    );
    return { sent: true, emailDelivery: "sent" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email forwarding failed.";
    await ContactMessage.updateOne(
      { _id: message._id },
      { $set: { emailDeliveryStatus: "failed", emailDeliveryError: reason.slice(0, 500) } },
    );
    console.error("Styler contact email forwarding failed", {
      messageId: String(message._id),
      error: reason,
    });
    return { sent: true, emailDelivery: "failed" };
  }
});
