import User from "@/models/User";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { AppError } from "@/types";
import { z } from "zod";
import { httpUrlSchema, phoneSchema } from "@/lib/validation";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  profileImageUrl: httpUrlSchema.optional().or(z.literal("")),
  notificationPreferences: z.object({
    email: z.boolean().optional(),
    webPush: z.boolean().optional(),
  }).refine((value) => Object.keys(value).length > 0, "Choose at least one notification preference.").optional(),
}).refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required.",
);

export const GET = withApi(async (request) => {
  const auth = await currentUser(request);
  const user = await User.findById(auth.userId)
    .select("name email phone role emailVerifiedAt profileImageUrl notificationPreferences savedAddresses createdAt updatedAt")
    .lean();
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  return {
    ...user,
    notificationPreferences: {
      email: user.notificationPreferences?.email ?? true,
      webPush: user.notificationPreferences?.webPush ?? true,
    },
  };
});

export const PATCH = withApi(async (request) => {
  const auth = await currentUser(request, ["customer", "professional"]);
  const body = profileSchema.parse(await readJson(request));
  const update: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.phone !== undefined) {
    if (body.phone) update.phone = body.phone;
    else unset.phone = 1;
  }
  if (body.profileImageUrl !== undefined) {
    if (body.profileImageUrl) update.profileImageUrl = body.profileImageUrl;
    else unset.profileImageUrl = 1;
  }
  if (body.notificationPreferences?.email !== undefined) {
    update["notificationPreferences.email"] = body.notificationPreferences.email;
  }
  if (body.notificationPreferences?.webPush !== undefined) {
    update["notificationPreferences.webPush"] = body.notificationPreferences.webPush;
  }
  const changes: Record<string, unknown> = {};
  if (Object.keys(update).length) changes.$set = update;
  if (Object.keys(unset).length) changes.$unset = unset;
  const user = await User.findByIdAndUpdate(auth.userId, changes, { new: true, runValidators: true })
    .select("name email phone role emailVerifiedAt profileImageUrl notificationPreferences savedAddresses updatedAt")
    .lean();
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  return {
    ...user,
    notificationPreferences: {
      email: user.notificationPreferences?.email ?? true,
      webPush: user.notificationPreferences?.webPush ?? true,
    },
  };
});
