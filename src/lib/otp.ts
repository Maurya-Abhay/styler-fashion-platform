import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import EmailOtp from "@/models/EmailOtp";
import type { OtpPurpose } from "@/types";
import { AppError } from "@/types";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES ?? 10);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);

function otpPepper(): string {
  const pepper = process.env.OTP_PEPPER || process.env.SESSION_SECRET;
  if (!pepper || pepper.length < 32) throw new Error("Set OTP_PEPPER (at least 32 characters) in the server environment.");
  return pepper;
}

function hashOtp(userId: string, purpose: OtpPurpose, otp: string): string {
  return createHmac("sha256", otpPepper()).update(`${userId}:${purpose}:${otp}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

export async function issueOtp(input: { userId: string; email: string; purpose: OtpPurpose }): Promise<{ otp: string; expiresAt: Date; otpId: string }> {
  if (!Number.isFinite(OTP_TTL_MINUTES) || OTP_TTL_MINUTES < 2 || OTP_TTL_MINUTES > 30) throw new Error("OTP_TTL_MINUTES must be between 2 and 30.");
  if (!Number.isInteger(OTP_MAX_ATTEMPTS) || OTP_MAX_ATTEMPTS < 1 || OTP_MAX_ATTEMPTS > 10) throw new Error("OTP_MAX_ATTEMPTS must be between 1 and 10.");
  await EmailOtp.updateMany(
    { userId: input.userId, purpose: input.purpose, consumedAt: null, invalidatedAt: null },
    { $set: { invalidatedAt: new Date() } },
  );
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
  const record = await EmailOtp.create({
    userId: input.userId,
    email: input.email.toLowerCase().trim(),
    purpose: input.purpose,
    otpHash: hashOtp(input.userId, input.purpose, otp),
    expiresAt,
    maxAttempts: OTP_MAX_ATTEMPTS,
  });
  return { otp, expiresAt, otpId: String(record._id) };
}

export async function verifyOtp(input: { userId: string; purpose: OtpPurpose; otp: string }): Promise<boolean> {
  if (!/^\d{6}$/.test(input.otp)) return false;
  const now = new Date();
  const record = await EmailOtp.findOne({
    userId: input.userId,
    purpose: input.purpose,
    consumedAt: null,
    invalidatedAt: null,
    expiresAt: { $gt: now },
    $expr: { $lt: ["$attempts", "$maxAttempts"] },
  }).select("+otpHash").sort({ createdAt: -1 });
  if (!record) return false;

  const actualHash = hashOtp(input.userId, input.purpose, input.otp);
  if (!safeEqualHex(String(record.otpHash), actualHash)) {
    // Do not compare against the stale attempts value read above: concurrent wrong
    // attempts must still increment the counter instead of silently disappearing.
    const updated = await EmailOtp.findOneAndUpdate(
      {
        _id: record._id,
        consumedAt: null,
        invalidatedAt: null,
        expiresAt: { $gt: now },
        $expr: { $lt: ["$attempts", "$maxAttempts"] },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (updated && Number(updated.attempts) >= Number(updated.maxAttempts)) {
      await EmailOtp.updateOne(
        { _id: updated._id, consumedAt: null, invalidatedAt: null, attempts: { $gte: updated.maxAttempts } },
        { $set: { invalidatedAt: now } },
      );
    }
    return false;
  }

  const consumed = await EmailOtp.findOneAndUpdate(
    {
      _id: record._id,
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { $gt: now },
      $expr: { $lt: ["$attempts", "$maxAttempts"] },
    },
    { $set: { consumedAt: now } },
    { new: true },
  );
  return Boolean(consumed);
}

export async function consumeOtpOrThrow(input: { userId: string; purpose: OtpPurpose; otp: string }): Promise<void> {
  const valid = await verifyOtp(input);
  if (!valid) throw new AppError("The code is invalid, expired, or has already been used.", 400, "INVALID_OTP");
}
