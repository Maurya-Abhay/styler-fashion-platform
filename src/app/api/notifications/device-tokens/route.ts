import { z } from "zod";
import DeviceToken from "@/models/DeviceToken";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { enforceRateLimit } from "@/lib/rate-limit";
import { AppError } from "@/types";

const expoTokenSchema = z.string().trim().min(10).max(200)
  .regex(/^(Expo|Exponent)PushToken\[[^\]]+\]$/, "Invalid Expo push token.");
const tokenSchema = z.object({
  expoPushToken: expoTokenSchema,
  platform: z.enum(["ios", "android"]),
  deviceId: z.string().trim().max(200).optional(),
});

export const POST = withApi(async (request) => {
  const auth = await currentUser(request, ["customer", "professional"]);
  await enforceRateLimit({ key: `device-token:${auth.userId}`, limit: 30, windowMs: 60 * 60_000 });
  const body = tokenSchema.parse(await readJson(request));
  const result = await DeviceToken.findOneAndUpdate(
    { expoPushToken: body.expoPushToken },
    {
      $set: {
        userId: auth.userId,
        platform: body.platform,
        ...(body.deviceId ? { deviceId: body.deviceId } : {}),
        isActive: true,
        lastSeenAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
  ).select("_id platform isActive lastSeenAt").lean();
  if (!result) throw new AppError("Could not register this device.", 500, "DEVICE_TOKEN_REGISTER_FAILED");
  return { registered: true, id: String(result._id), platform: result.platform, lastSeenAt: result.lastSeenAt };
});

export const DELETE = withApi(async (request) => {
  const auth = await currentUser(request, ["customer", "professional"]);
  await enforceRateLimit({ key: `device-token:${auth.userId}`, limit: 30, windowMs: 60 * 60_000 });
  const body = z.object({ expoPushToken: expoTokenSchema }).parse(await readJson(request));
  const result = await DeviceToken.updateOne(
    { userId: auth.userId, expoPushToken: body.expoPushToken },
    { $set: { isActive: false } },
  );
  return { deactivated: result.modifiedCount > 0 };
});
