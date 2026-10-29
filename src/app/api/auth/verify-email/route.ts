import { verifyEmailSchema, parseOrThrow } from "@/lib/validation";
import { verifyEmailAddress } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJson, withApi, ipHash } from "@/lib/api-utils";

export const POST = withApi(async (request) => {
  const body = parseOrThrow(verifyEmailSchema, await readJson(request));
  await enforceRateLimit({ key: `verify-email:${body.email}:${ipHash(request) || "unknown"}`, limit: 10, windowMs: 15 * 60_000 });
  await enforceRateLimit({ key: `verify-email-email:${body.email}`, limit: 20, windowMs: 60 * 60_000 });
  return verifyEmailAddress(body);
});
