import { createHmac } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { AppError } from "@/types";

interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
  createdAt: Date;
}
let ttlIndexPromise: Promise<string> | null = null;

function obscureKey(key: string): string {
  const pepper = process.env.RATE_LIMIT_PEPPER || process.env.SESSION_SECRET;
  if (!pepper || pepper.length < 16) throw new Error("Set RATE_LIMIT_PEPPER (at least 16 characters) for rate limiting.");
  return createHmac("sha256", pepper).update(key).digest("hex");
}

async function collection() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is not available.");
  const coll = db.collection<RateLimitDoc>("rate_limits");
  if (!ttlIndexPromise) ttlIndexPromise = coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch((error) => { ttlIndexPromise = null; throw error; });
  await ttlIndexPromise;
  return coll;
}

export interface RateLimitResult { allowed: boolean; limit: number; remaining: number; resetAt: Date; }

/** MongoDB-backed fixed-window limiter, shared by all app instances. */
export async function checkRateLimit(input: {
  key: string; limit: number; windowMs: number; now?: Date;
}): Promise<RateLimitResult> {
  if (!input.key.trim() || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 10000 || !Number.isInteger(input.windowMs) || input.windowMs < 1000) {
    throw new AppError("Invalid rate-limit configuration.", 500, "INVALID_RATE_LIMIT_CONFIG");
  }
  const now = input.now ?? new Date();
  const windowStart = Math.floor(now.getTime() / input.windowMs) * input.windowMs;
  const resetAt = new Date(windowStart + input.windowMs);
  const id = `${obscureKey(input.key)}:${windowStart}`;
  const coll = await collection();
  try {
    await coll.updateOne(
      { _id: id },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt.getTime() + input.windowMs), createdAt: now } },
      { upsert: true },
    );
  } catch (error) {
    // Two first requests can race to upsert the same _id. On duplicate key, increment the existing row.
    if ((error as { code?: number })?.code !== 11000) throw error;
    await coll.updateOne({ _id: id }, { $inc: { count: 1 } });
  }
  const current = await coll.findOne({ _id: id });
  const count = current?.count ?? 0;
  return { allowed: count <= input.limit, limit: input.limit, remaining: Math.max(0, input.limit - count), resetAt };
}

export async function enforceRateLimit(input: { key: string; limit: number; windowMs: number; now?: Date }): Promise<RateLimitResult> {
  const result = await checkRateLimit(input);
  if (!result.allowed) throw new AppError("Too many attempts. Please try again later.", 429, "RATE_LIMITED", { retryAfterSeconds: Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)) });
  return result;
}
