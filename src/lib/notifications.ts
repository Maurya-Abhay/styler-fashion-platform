import Notification from "@/models/Notification";
import User from "@/models/User";
import { sendBookingEmail } from "@/lib/zeptomail";
import { sendWebPushToUser } from "@/lib/web-push";

export type NotificationChannel = "in_app" | "email" | "web_push";
export type NotificationType =
  | "booking_request_received" | "booking_offer_accepted" | "booking_offer_closed"
  | "booking_confirmed" | "booking_cancelled" | "booking_started" | "booking_completed"
  | "payment_success" | "payment_failed" | "refund_updated" | "application_status"
  | "payout_status" | "review_received" | "system_message";

export interface NotifyUserInput {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  data?: Record<string, unknown>;
  dedupeKey?: string;
}

/** Persist in-app notification immediately and queue external delivery for an authenticated worker. */
export async function notifyUser(input: NotifyUserInput) {
  const channels = [...new Set<NotificationChannel>(["in_app", ...(input.channels ?? [])])];
  try {
    return await Notification.create({
      recipientUserId: input.recipientUserId,
      type: input.type,
      title: input.title.slice(0, 160),
      message: input.message.slice(0, 2000),
      channels,
      data: input.data ?? {},
      dedupeKey: input.dedupeKey,
      deliveries: channels
        .filter((channel) => channel !== "in_app")
        .map((channel) => ({ channel, status: "queued", attemptCount: 0 })),
    });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000 && input.dedupeKey) {
      const existing = await Notification.findOne({ dedupeKey: input.dedupeKey });
      if (existing) return existing;
    }
    throw error;
  }
}

const MAX_DELIVERY_ATTEMPTS = 5;
const DELIVERY_LEASE_MS = 90_000;
const BASE_RETRY_DELAY_MS = 60_000;

function isDue(delivery: any, nowMs: number): boolean {
  const attempts = Number(delivery.attemptCount ?? 0);
  if (attempts >= MAX_DELIVERY_ATTEMPTS) return false;
  if (delivery.status === "queued") return true;
  if (delivery.status === "sending") {
    return Boolean(delivery.leaseUntil && new Date(delivery.leaseUntil).getTime() <= nowMs);
  }
  if (delivery.status !== "failed") return false;
  const attemptedAt = delivery.attemptedAt ? new Date(delivery.attemptedAt).getTime() : 0;
  const backoff = Math.min(30 * 60_000, BASE_RETRY_DELAY_MS * (2 ** Math.max(0, attempts - 1)));
  return !attemptedAt || nowMs - attemptedAt >= backoff;
}

function deliveryClaimFilter(delivery: any, now: Date): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    channel: delivery.channel,
    status: delivery.status,
    attemptCount: Number(delivery.attemptCount ?? 0),
  };
  filter.attemptedAt = delivery.attemptedAt ?? null;
  if (delivery.status === "sending") filter.leaseUntil = { $lte: now };
  return filter;
}

function arrayFilterFromClaim(filter: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    result[`delivery.${key}`] = value;
  }
  return result;
}

async function deliverClaimedNotification(input: {
  note: any;
  channel: "email" | "web_push";
  attemptAt: Date;
}): Promise<"sent" | "failed" | "skipped"> {
  const { note, channel, attemptAt } = input;
  let status: "sent" | "failed" | "skipped" = "sent";
  let providerMessageId: string | undefined;
  let lastError: string | undefined;

  try {
    const user = await User.findById(note.recipientUserId).select("name email accountStatus").lean();
    if (!user || user.accountStatus !== "active") {
      status = "skipped";
      lastError = "Recipient account is unavailable or inactive.";
    } else if (channel === "email") {
      const result = await sendBookingEmail({
        email: user.email,
        name: user.name,
        subject: note.title,
        message: note.message,
      });
      providerMessageId = result.messageId;
    } else {
      const result = await sendWebPushToUser({
        userId: String(note.recipientUserId),
        title: note.title,
        body: note.message,
        data: (note.data ?? {}) as Record<string, unknown>,
      });
      if (result.sent === 0 && result.failed > 0) throw new Error("All web-push deliveries failed.");
      if (result.sent === 0 && result.failed === 0) {
        status = "skipped";
        lastError = "No active browser push subscription exists for this user.";
      } else {
        providerMessageId = `sent:${result.sent};failed:${result.failed}`;
      }
    }
  } catch (error) {
    status = "failed";
    lastError = (error instanceof Error ? error.message : "Delivery failed").slice(0, 1000);
  }

  const set: Record<string, unknown> = {
    "deliveries.$[delivery].status": status,
    "deliveries.$[delivery].attemptedAt": attemptAt,
  };
  const unset: Record<string, 1> = { "deliveries.$[delivery].leaseUntil": 1 };
  if (providerMessageId) set["deliveries.$[delivery].providerMessageId"] = providerMessageId;
  else unset["deliveries.$[delivery].providerMessageId"] = 1;
  if (lastError) set["deliveries.$[delivery].lastError"] = lastError;
  else unset["deliveries.$[delivery].lastError"] = 1;
  if (status === "sent") set["deliveries.$[delivery].deliveredAt"] = new Date();

  await Notification.updateOne(
    { _id: note._id },
    { $set: set, $unset: unset },
    { arrayFilters: [{ "delivery.channel": channel, "delivery.status": "sending", "delivery.attemptedAt": attemptAt }] },
  );
  return status;
}

/** Atomic lease-based worker, safe for overlapping cron invocations. */
export async function processQueuedNotificationDeliveries(input: { limit?: number; concurrency?: number } = {}) {
  const limit = Math.max(1, Math.min(250, Math.floor(input.limit ?? 100)));
  const concurrency = Math.max(1, Math.min(10, Math.floor(input.concurrency ?? 5)));
  const now = new Date();
  const retryAfter = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
  const dueConditions = [
    { status: "queued", attemptCount: { $lt: MAX_DELIVERY_ATTEMPTS } },
    { status: "failed", attemptCount: { $lt: MAX_DELIVERY_ATTEMPTS }, attemptedAt: null },
    { status: "failed", attemptCount: 1, attemptedAt: { $lte: retryAfter(1) } },
    { status: "failed", attemptCount: 2, attemptedAt: { $lte: retryAfter(2) } },
    { status: "failed", attemptCount: 3, attemptedAt: { $lte: retryAfter(4) } },
    { status: "failed", attemptCount: 4, attemptedAt: { $lte: retryAfter(8) } },
    { status: "sending", attemptCount: { $lt: MAX_DELIVERY_ATTEMPTS }, leaseUntil: { $lte: now } },
  ];
  const notifications = await Notification.find({
    deliveries: { $elemMatch: { channel: { $in: ["email", "web_push"] }, $or: dueConditions } },
  }).sort({ createdAt: 1 }).limit(limit)
    .select("recipientUserId title message data deliveries createdAt").lean();

  const jobs: Array<{ note: any; delivery: any }> = [];
  for (const note of notifications) {
    for (const delivery of note.deliveries ?? []) {
      if ((delivery.channel === "email" || delivery.channel === "web_push") && isDue(delivery, now.getTime())) {
        jobs.push({ note, delivery });
      }
    }
  }

  let attempted = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let cursor = 0;

  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= jobs.length) return;
      const { note, delivery } = jobs[index];
      const attemptAt = new Date();
      const claimFilter = deliveryClaimFilter(delivery, attemptAt);
      const claimed = await Notification.findOneAndUpdate(
        { _id: note._id, deliveries: { $elemMatch: claimFilter } },
        {
          $set: {
            "deliveries.$[delivery].status": "sending",
            "deliveries.$[delivery].attemptedAt": attemptAt,
            "deliveries.$[delivery].leaseUntil": new Date(attemptAt.getTime() + DELIVERY_LEASE_MS),
          },
          $inc: { "deliveries.$[delivery].attemptCount": 1 },
        },
        { new: true, arrayFilters: [arrayFilterFromClaim(claimFilter)] },
      ).lean();
      if (!claimed) continue;
      attempted++;
      const result = await deliverClaimedNotification({ note: claimed, channel: delivery.channel, attemptAt });
      if (result === "sent") sent++;
      else if (result === "failed") failed++;
      else if (result === "skipped") skipped++;
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker()));
  return { notificationsScanned: notifications.length, deliveriesDue: jobs.length, attempted, sent, failed, skipped };
}

export async function listNotifications(userId: string, input: { page?: number; limit?: number; unreadOnly?: boolean } = {}) {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit ?? 20)));
  const filter: Record<string, unknown> = { recipientUserId: userId };
  if (input.unreadOnly) filter.readAt = null;
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Notification.countDocuments(filter),
  ]);
  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
}

export async function markNotificationRead(input: { userId: string; notificationId: string }) {
  return Notification.findOneAndUpdate(
    { _id: input.notificationId, recipientUserId: input.userId },
    { $set: { readAt: new Date() } },
    { new: true },
  );
}
