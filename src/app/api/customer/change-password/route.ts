import { z } from "zod";
import User from "@/models/User";
import Session from "@/models/Session";
import { currentUser, readJson, withApi } from "@/lib/api-utils";
import { hashPassword, verifyPassword } from "@/lib/password";
import { enforceRateLimit } from "@/lib/rate-limit";
import { passwordSchema } from "@/lib/validation";
import { AppError } from "@/types";

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
}).refine((value) => value.currentPassword !== value.newPassword, {
  path: ["newPassword"],
  message: "Choose a password different from your current password.",
});

export const POST = withApi(async (request) => {
  const auth = await currentUser(request, ["customer", "professional"]);
  await enforceRateLimit({
    key: `change-password:${auth.userId}`,
    limit: 5,
    windowMs: 15 * 60_000,
  });
  const body = schema.parse(await readJson(request));
  const user = await User.findById(auth.userId).select("+passwordHash");
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw new AppError("Your current password is incorrect.", 400, "INVALID_CURRENT_PASSWORD");
  }

  user.passwordHash = await hashPassword(body.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();

  await Session.updateMany(
    { userId: auth.userId, _id: { $ne: auth.sessionId }, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { message: "Your password has been changed. Other active sessions were signed out." };
});
