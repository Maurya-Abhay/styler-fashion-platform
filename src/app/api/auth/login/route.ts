import { loginSchema, parseOrThrow } from "@/lib/validation";
import { loginUser, hashIpForLogging } from "@/lib/auth";
import { buildSessionCookie } from "@/lib/session";
import { enforceRateLimit } from "@/lib/rate-limit";
import { readJson, withApi, ipHash } from "@/lib/api-utils";
import { NextResponse } from "next/server";

export const POST = withApi(async (request) => {
  const body = parseOrThrow(loginSchema, await readJson(request));
  const ip = ipHash(request) || "unknown";
  await enforceRateLimit({ key: `login:${body.email}:${ip}`, limit: 10, windowMs: 15 * 60_000 });
  // Credential-stuffing guards: one IP rotating emails, and one email attacked from many IPs.
  await enforceRateLimit({ key: `login-ip:${ip}`, limit: 60, windowMs: 15 * 60_000 });
  await enforceRateLimit({ key: `login-email:${body.email}`, limit: 30, windowMs: 60 * 60_000 });
  const authMethod = request.headers.get("x-auth-method") === "mobile" ? "mobile" : "web";
  const result = await loginUser({ email: body.email, password: body.password, authMethod, userAgent: request.headers.get("user-agent") ?? undefined, ipHash: ipHash(request) });
  const payload: Record<string, unknown> = { user: result.user, nextPath: result.nextPath, expiresAt: result.session.expiresAt };
  if (authMethod === "mobile") payload.sessionToken = result.session.token;
  const response = NextResponse.json({ success: true, data: payload });
  if (authMethod === "web") response.headers.append("Set-Cookie", buildSessionCookie(result.session.token, result.session.expiresAt));
  return response;
});
