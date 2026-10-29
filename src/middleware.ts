import { NextResponse, type NextRequest } from "next/server";

/**
 * Defence-in-depth CSRF guard for cookie-authenticated API calls.
 * The session cookie is already SameSite=Lax; this additionally rejects state-changing
 * requests whose Origin header points at a different site. Bearer-token (mobile) calls,
 * webhooks and cron calls carry no session cookie and are unaffected.
 */
export function middleware(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return NextResponse.next();

  const origin = request.headers.get("origin");
  const usesCookieSession = (request.headers.get("cookie") ?? "").includes("styler_session=");
  if (!origin || !usesCookieSession || request.headers.get("authorization")) return NextResponse.next();

  const allowedHosts = new Set<string>();
  for (const value of [request.headers.get("x-forwarded-host"), request.headers.get("host"), request.nextUrl.host]) {
    if (value) allowedHosts.add(value.split(",")[0].trim().toLowerCase());
  }
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try { if (value) allowedHosts.add(new URL(value).host.toLowerCase()); } catch { /* ignore invalid URL */ }
  }

  let originHost = "";
  try { originHost = new URL(origin).host.toLowerCase(); } catch { /* malformed origin */ }
  if (originHost && allowedHosts.has(originHost)) return NextResponse.next();

  return NextResponse.json(
    { success: false, error: { code: "CROSS_ORIGIN_REJECTED", message: "Cross-origin request rejected." } },
    { status: 403 },
  );
}

export const config = { matcher: ["/api/:path*"] };
