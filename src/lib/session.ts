import { createHash, randomBytes } from "node:crypto";
import Session from "@/models/Session";
import type { AuthMethod } from "@/types";

export const SESSION_COOKIE_NAME = "styler_session";
const DEFAULT_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS ?? 30);

export function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function buildSessionCookie(rawToken: string, expiresAt: Date): string {
  const maxAge = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function buildClearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function createSession(
  userId: string,
  options: { authMethod?: AuthMethod; userAgent?: string; ipHash?: string; ttlDays?: number } = {},
): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
  const token = randomBytes(32).toString("base64url");
  const ttlDays = options.ttlDays ?? DEFAULT_TTL_DAYS;
  if (!Number.isFinite(ttlDays) || ttlDays < 1 || ttlDays > 90) throw new Error("Session TTL must be between 1 and 90 days.");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId,
    tokenHash: hashSessionToken(token),
    authMethod: options.authMethod ?? "web",
    userAgent: options.userAgent?.slice(0, 500),
    ipHash: options.ipHash,
    expiresAt,
    lastSeenAt: new Date(),
  });
  return { token, expiresAt, sessionId: String(session._id) };
}

export function extractSessionToken(request: Request): { token: string; authMethod: AuthMethod } | null {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    return token ? { token, authMethod: "mobile" } : null;
  }
  const cookieHeader = request.headers.get("cookie") ?? "";
  for (const segment of cookieHeader.split(";")) {
    const [name, ...rest] = segment.trim().split("=");
    if (name === SESSION_COOKIE_NAME) {
      const value = rest.join("=");
      if (!value) return null;
      try { return { token: decodeURIComponent(value), authMethod: "web" }; }
      catch { return null; }
    }
  }
  return null;
}

export async function findActiveSession(rawToken: string) {
  if (!rawToken || rawToken.length > 256) return null;
  return Session.findOne({
    tokenHash: hashSessionToken(rawToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
}

export async function revokeSession(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const result = await Session.updateOne(
    { tokenHash: hashSessionToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount > 0;
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await Session.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  return result.modifiedCount;
}
