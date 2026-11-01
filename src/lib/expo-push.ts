import DeviceToken from "@/models/DeviceToken";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const MAX_BATCH = 100;

export async function sendExpoPushToUser(input: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const devices = await DeviceToken.find({ userId: input.userId, isActive: true })
    .select("_id expoPushToken")
    .lean();
  if (!devices.length) return { sent: 0, failed: 0, skipped: true };

  let sent = 0;
  let failed = 0;
  for (let offset = 0; offset < devices.length; offset += MAX_BATCH) {
    const batch = devices.slice(offset, offset + MAX_BATCH);
    const messages = batch.map((device: any) => ({
      to: device.expoPushToken,
      title: input.title.slice(0, 160),
      body: input.body.slice(0, 1000),
      sound: "default",
      channelId: "styler-bookings",
      priority: "high",
      ttl: 60 * 60,
      data: input.data ?? {},
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "Accept-Encoding": "gzip, deflate" },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(12_000),
    });
    const text = await response.text();
    let payload: any = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }
    if (!response.ok) throw new Error(`Expo push service returned HTTP ${response.status}.`);
    const tickets = Array.isArray(payload.data) ? payload.data : [];

    for (let index = 0; index < batch.length; index += 1) {
      const ticket = tickets[index];
      if (ticket?.status === "ok") {
        sent += 1;
        continue;
      }
      failed += 1;
      if (ticket?.details?.error === "DeviceNotRegistered") {
        await DeviceToken.updateOne({ _id: batch[index]._id }, { $set: { isActive: false } });
      }
    }
  }
  return { sent, failed, skipped: false };
}
