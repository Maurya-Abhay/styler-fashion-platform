import { z } from "zod";
import { parseOrThrow } from "@/lib/validation";
import { requestPasswordReset } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJson, withApi, ipHash } from "@/lib/api-utils";

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
export const POST = withApi(async (request) => {
  const body = parseOrThrow(schema, await readJson(request));
  await enforceRateLimit({ key: `forgot-password:${body.email}:${ipHash(request) || "unknown"}`, limit: 5, windowMs: 30 * 60_000 });
  await enforceRateLimit({ key: `forgot-password-email:${body.email}`, limit: 10, windowMs: 60 * 60_000 });
  await requestPasswordReset(body.email);
  return { message: "If an active account exists, password-reset instructions have been sent." };
});
