import { NextResponse, type NextRequest } from "next/server";

const CORS_METHODS = "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_HEADERS = "Accept, Authorization, Content-Type, X-Auth-Method, X-Request-Id";

function isAllowedAppOrigin(origin: string): boolean {
  const configuredOrigins = [
    process.env.MOBILE_WEB_ORIGINS,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => {
      try {
        return new URL(value.trim()).origin.toLowerCase();
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  if (configuredOrigins.includes(origin.toLowerCase())) return true;

  if (process.env.NODE_ENV !== "production") {
    return /^http:\/\/(localhost|127\.0\.0\.1):(8081|8082|19006)$/.test(origin);
  }

  return false;
}

function corsHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (origin && isAllowedAppOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", CORS_METHODS);
    headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
    headers.set("Access-Control-Max-Age", "600");
    headers.append("Vary", "Origin");
  }
  return headers;
}

function nextWithCors(request: NextRequest) {
  return NextResponse.next({ headers: corsHeaders(request) });
}

/**
 * Defence-in-depth CSRF guard for cookie-authenticated API calls.
 * The session cookie is already SameSite=Lax; this additionally rejects state-changing
 * requests whose Origin header points at a different site. Bearer-token (mobile) calls,
 * webhooks and cron calls carry no session cookie and are unaffected.
 */
export function middleware(request: NextRequest) {
  const method = request.method.toUpperCase();
  const headers = corsHeaders(request);
  if (method === "OPTIONS") return new NextResponse(null, { status: 204, headers });
  if (method === "GET" || method === "HEAD") return NextResponse.next({ headers });

  const origin = request.headers.get("origin");
  const usesCookieSession = (request.headers.get("cookie") ?? "").includes("styler_session=");
  if (!origin || !usesCookieSession || request.headers.get("authorization")) return nextWithCors(request);

  const allowedHosts = new Set<string>();
  for (const value of [request.headers.get("x-forwarded-host"), request.headers.get("host"), request.nextUrl.host]) {
    if (value) allowedHosts.add(value.split(",")[0].trim().toLowerCase());
  }
  for (const value of [process.env.APP_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    try { if (value) allowedHosts.add(new URL(value).host.toLowerCase()); } catch { /* ignore invalid URL */ }
  }

  let originHost = "";
  try { originHost = new URL(origin).host.toLowerCase(); } catch { /* malformed origin */ }
  if (originHost && allowedHosts.has(originHost)) return nextWithCors(request);

  return NextResponse.json(
    { success: false, error: { code: "CROSS_ORIGIN_REJECTED", message: "Cross-origin request rejected." } },
    { status: 403, headers },
  );
}

export const config = { matcher: ["/api/:path*"] };
