import { resendOtpSchema, parseOrThrow } from "@/lib/validation";
import { resendVerificationCode } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJson, withApi, ipHash } from "@/lib/api-utils";

export const POST = withApi(async (request) => {
  const body = parseOrThrow(resendOtpSchema, await readJson(request));
  await enforceRateLimit({ key: `resend-otp:${body.email}:${ipHash(request) || "unknown"}`, limit: 4, windowMs: 15 * 60_000 });
  await enforceRateLimit({ key: `resend-otp-email:${body.email}`, limit: 8, windowMs: 60 * 60_000 });
  await resendVerificationCode(body.email);
  return { message: "If the account is eligible, a verification code has been sent." };
});
