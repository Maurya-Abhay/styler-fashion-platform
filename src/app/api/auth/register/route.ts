import { registerSchema, parseOrThrow } from "@/lib/validation";
import { registerUser, hashIpForLogging } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJson, withApi, ipHash } from "@/lib/api-utils";

export const POST = withApi(async (request) => {
  const body = parseOrThrow(registerSchema, await readJson(request));
  const ip = ipHash(request) || "unknown";
  await enforceRateLimit({ key: `register:${ip}`, limit: 8, windowMs: 60 * 60_000 });
  await enforceRateLimit({ key: `register-email:${body.email}`, limit: 4, windowMs: 60 * 60_000 });
  const result = await registerUser({ name: body.name, email: body.email, phone: body.phone, password: body.password, role: body.role });
  return Response.json({ success: true, data: result }, { status: 201 });
});
