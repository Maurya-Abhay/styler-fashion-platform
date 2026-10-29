import { logoutRequest } from "@/lib/auth";
import { buildClearSessionCookie } from "@/lib/session";
import { withApi } from "@/lib/api-utils";
import { NextResponse } from "next/server";

export const POST = withApi(async (request) => {
  await logoutRequest(request);
  const response = NextResponse.json({ success: true, data: { message: "Signed out." } });
  if (!request.headers.get("authorization")?.startsWith("Bearer ")) response.headers.append("Set-Cookie", buildClearSessionCookie());
  return response;
});
