import { resetPasswordSchema, parseOrThrow } from "@/lib/validation";
import { completePasswordReset } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJson, withApi, ipHash } from "@/lib/api-utils";

export const POST = withApi(async (request) => {
  const body = parseOrThrow(resetPasswordSchema, await readJson(request));
  await enforceRateLimit({ key: `reset-password:${body.email}:${ipHash(request) || "unknown"}`, limit: 8, windowMs: 30 * 60_000 });
  await enforceRateLimit({ key: `reset-password-email:${body.email}`, limit: 20, windowMs: 60 * 60_000 });
  await completePasswordReset({ email: body.email, otp: body.otp, newPassword: body.newPassword });
  return { message: "Password updated. Please sign in again." };
});
