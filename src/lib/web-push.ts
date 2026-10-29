import webpush from "web-push";
import PushSubscription from "@/models/PushSubscription";
import { AppError } from "@/types";

let vapidConfigured = false;
function configureVapid(): void {
  if (vapidConfigured) return;
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;
  if (!publicKey || !privateKey || !subject) throw new Error("WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY and WEB_PUSH_SUBJECT must be configured.");
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

// Browser push endpoints are fetched server-side by web-push, so an arbitrary user-supplied host
// would be an SSRF vector. Only the real browser push services are accepted.
const PUSH_HOST_SUFFIXES = [
  "fcm.googleapis.com", "android.googleapis.com",       // Chrome, Edge, Opera, Brave, Samsung (FCM)
  "push.services.mozilla.com", "push.mozilla.com",      // Firefox
  "notify.windows.com",                                 // legacy Edge / WNS
  "push.apple.com",                                     // Safari / iOS web push
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
    const host = url.hostname.toLowerCase();
    return PUSH_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
  } catch { return false; }
}

export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userAgent?: string;
  expirationTime?: Date | null;
}) {
  if (!isAllowedPushEndpoint(input.endpoint) || input.endpoint.length > 3000) throw new AppError("Invalid browser push endpoint.", 400, "INVALID_PUSH_ENDPOINT");
  if (!input.keys?.p256dh || !input.keys?.auth) throw new AppError("Push subscription keys are missing.", 400, "INVALID_PUSH_KEYS");
  return PushSubscription.findOneAndUpdate(
    { endpoint: input.endpoint },
    { $set: { userId: input.userId, keys: input.keys, userAgent: input.userAgent?.slice(0, 500), expirationTime: input.expirationTime ?? null, isActive: true, lastFailureAt: null } },
    { new: true, upsert: true, runValidators: true },
  );
}

export async function deactivatePushSubscription(input: { userId: string; endpoint: string }): Promise<boolean> {
  const result = await PushSubscription.updateOne({ userId: input.userId, endpoint: input.endpoint }, { $set: { isActive: false } });
  return result.modifiedCount > 0;
}

export async function sendWebPushToUser(input: { userId: string; title: string; body: string; url?: string; data?: Record<string, unknown> }) {
  configureVapid();
  const subscriptions = await PushSubscription.find({ userId: input.userId, isActive: true }).limit(50);
  const payload = JSON.stringify({ title: input.title, body: input.body, url: input.url ?? "/", data: input.data ?? {} });
  const results = await Promise.allSettled(subscriptions.map(async (subscription: any) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: subscription.keys }, payload, { TTL: 60 * 60, urgency: "high" });
      subscription.lastUsedAt = new Date();
      await subscription.save();
      return { endpoint: subscription.endpoint, sent: true };
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      subscription.lastFailureAt = new Date();
      if (statusCode === 404 || statusCode === 410) subscription.isActive = false;
      await subscription.save().catch(() => undefined);
      throw error;
    }
  }));
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return { sent, failed: results.length - sent, results };
}

export async function requireWebPushConfigured(): Promise<void> {
  try { configureVapid(); }
  catch (error) { throw new AppError(error instanceof Error ? error.message : "Web Push is not configured.", 500, "WEB_PUSH_NOT_CONFIGURED"); }
}
