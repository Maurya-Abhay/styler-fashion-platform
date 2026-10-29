import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAuthenticatedUser, hashIpForLogging } from "@/lib/auth";
import type { AuthenticatedUser, UserRole } from "@/types";
import { AppError } from "@/types";
import AuditLog from "@/models/AuditLog";

export type ApiContext = { params?: Promise<any> | any };
export type ApiHandler = (request: Request, context: ApiContext) => Promise<unknown | Response>;

export function apiResponse(data: unknown, status = 200, headers?: HeadersInit): Response {
  return NextResponse.json({ success: true, data }, { status, headers });
}

export function apiErrorResponse(message: string, status = 400, code = "APP_ERROR", details?: unknown): Response {
  return NextResponse.json({ success: false, error: { code, message, ...(details !== undefined ? { details } : {}) } }, { status });
}

export function withApi(handler: ApiHandler) {
  return async (request: Request, context?: any): Promise<Response> => {
    context = context ?? {};
    const requestId = request.headers.get("x-request-id")?.slice(0, 100) || randomUUID();
    try {
      await connectDB();
      const result = await handler(request, context);
      if (result instanceof Response) return result;
      return NextResponse.json({ success: true, data: result, requestId });
    } catch (error) {
      let status = 500;
      let code = "INTERNAL_ERROR";
      let message = "An unexpected server error occurred.";
      let details: unknown;
      if (error instanceof AppError) {
        status = error.statusCode;
        code = error.code;
        message = error.message;
        details = error.details;
      } else if (error instanceof mongoose.Error.ValidationError) {
        status = 400; code = "VALIDATION_ERROR"; message = "The submitted data is invalid.";
        details = Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message]));
      } else if (error instanceof mongoose.Error.CastError) {
        status = 400; code = "INVALID_ID"; message = "One of the supplied identifiers is invalid.";
      } else if (error && typeof error === "object" && (error as { name?: string }).name === "ZodError") {
        status = 400; code = "VALIDATION_ERROR"; message = "The submitted data is invalid.";
        details = (error as { issues?: unknown }).issues;
      } else if ((error as { code?: number })?.code === 11000) {
        status = 409; code = "DUPLICATE_RECORD"; message = "A record with these details already exists.";
      } else if (error && typeof error === "object" && typeof (error as { statusCode?: unknown }).statusCode === "number") {
        status = Number((error as { statusCode: number }).statusCode); code = String((error as { code?: string }).code || "APP_ERROR"); message = error instanceof Error ? error.message : "Request failed.";
      } else {
        console.error("Styler API error", { requestId, error: error instanceof Error ? error.message : "Unknown error" });
        if (process.env.NODE_ENV !== "production" && error instanceof Error) message = error.message;
      }
      return NextResponse.json({ success: false, error: { code, message, ...(details !== undefined ? { details } : {}) }, requestId }, { status });
    }
  };
}

export async function readJson(request: Request): Promise<Record<string, any>> {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) throw new AppError("Request body is too large.", 413, "BODY_TOO_LARGE");
  let value: unknown;
  try { value = await request.json(); } catch { throw new AppError("Request body must be valid JSON.", 400, "INVALID_JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AppError("Request body must be a JSON object.", 400, "INVALID_BODY");
  return value as Record<string, any>;
}

export async function routeParams(context: ApiContext): Promise<Record<string, string>> {
  const raw = await Promise.resolve(context.params ?? {});
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) result[key] = Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
  return result;
}

export function requireId(value: string | undefined, field = "id"): string {
  if (!value || !mongoose.isValidObjectId(value)) throw new AppError(`A valid ${field} is required.`, 400, "INVALID_ID");
  return value;
}

export async function currentUser(request: Request, roles?: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuthenticatedUser(request);
  if (roles?.length && !roles.includes(user.role)) throw new AppError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  return user;
}

export function paginationFromRequest(request: Request, defaultLimit = 20) {
  const url = new URL(request.url);
  const page = Math.max(1, Math.floor(Number(url.searchParams.get("page") || 1)) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(url.searchParams.get("limit") || defaultLimit)) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function ipHash(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return hashIpForLogging(forwarded || real || undefined);
}

export async function writeAudit(input: {
  actorUserId: string; actorRole: "customer" | "professional" | "admin" | "system";
  action: string; targetType: string; targetId: string; before?: unknown; after?: unknown;
  metadata?: Record<string, unknown>; request?: Request;
}) {
  return AuditLog.create({
    actorUserId: input.actorUserId, actorRole: input.actorRole, action: input.action,
    targetType: input.targetType, targetId: input.targetId,
    ...(input.before !== undefined ? { before: input.before } : {}),
    ...(input.after !== undefined ? { after: input.after } : {}),
    metadata: input.metadata ?? {},
    requestId: input.request?.headers.get("x-request-id")?.slice(0, 200),
    ipHash: input.request ? ipHash(input.request) : undefined,
    userAgent: input.request?.headers.get("user-agent")?.slice(0, 500),
  });
}

export function safeRegexText(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertCronSecret(request: Request): void {
  const expected = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!expected || expected.length < 24 || authorization !== `Bearer ${expected}`) {
    throw new AppError("Not authorized to invoke this scheduled task.", 401, "CRON_UNAUTHORIZED");
  }
}
