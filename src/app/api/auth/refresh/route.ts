import { withApi, currentUser } from "@/lib/api-utils";
import { createSession, extractSessionToken, revokeSession, buildSessionCookie } from "@/lib/session";
import { NextResponse } from "next/server";
import { hashIpForLogging } from "@/lib/auth";
import { ipHash } from "@/lib/api-utils";
import { AppError } from "@/types";

export const POST = withApi(async (request) => {
  const user = await currentUser(request);
  const tokenInfo = extractSessionToken(request);
  if (!tokenInfo) throw new AppError("Session token unavailable.", 401, "UNAUTHENTICATED");
  const next = await createSession(user.userId, { authMethod: tokenInfo.authMethod, userAgent: request.headers.get("user-agent") ?? undefined, ipHash: ipHash(request) });
  await revokeSession(tokenInfo.token);
  const payload: Record<string, unknown> = { expiresAt: next.expiresAt };
  if (tokenInfo.authMethod === "mobile") payload.sessionToken = next.token;
  const response = NextResponse.json({ success: true, data: payload });
  if (tokenInfo.authMethod === "web") response.headers.append("Set-Cookie", buildSessionCookie(next.token, next.expiresAt));
  return response;
});
