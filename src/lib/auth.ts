import { createHash } from "node:crypto";
import User from "@/models/User";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import { AppError, type AuthenticatedUser, type AuthMethod, type UserRole } from "@/types";
import { hashPassword, verifyPassword, burnPasswordCheck } from "@/lib/password";
import { issueOtp, consumeOtpOrThrow } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/zeptomail";
import { createSession, extractSessionToken, findActiveSession, revokeSession, revokeAllUserSessions } from "@/lib/session";

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: "customer" | "professional";
}

export interface LoginInput { email: string; password: string; authMethod?: AuthMethod; userAgent?: string; ipHash?: string; }

function normalizeEmail(email: string): string { return email.trim().toLowerCase(); }
function normalizePhone(phone: string): string {
  const normalized = phone.replace(/[\s()-]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) throw new AppError("Enter the mobile number in international format, for example +919876543210.", 400, "INVALID_PHONE");
  return normalized;
}
function safeUser(user: { _id: unknown; name: string; email: string; phone?: string; role: string; accountStatus: string; emailVerifiedAt?: Date | null; profileImageUrl?: string | null; savedAddresses?: unknown[] }) {
  return {
    id: String(user._id), name: user.name, email: user.email, phone: user.phone,
    role: user.role as UserRole, accountStatus: user.accountStatus,
    emailVerified: Boolean(user.emailVerifiedAt),
    ...(Object.prototype.hasOwnProperty.call(user, "profileImageUrl") ? { profileImageUrl: (user as { profileImageUrl?: string | null }).profileImageUrl ?? null } : {}),
    ...(Object.prototype.hasOwnProperty.call(user, "savedAddresses") ? { savedAddresses: (user as { savedAddresses?: unknown[] }).savedAddresses ?? [] } : {}),
  };
}

export async function registerUser(input: RegisterInput) {
  if (input.role !== "customer" && input.role !== "professional") {
    throw new AppError("Public registration can only create customer or professional accounts.", 400, "INVALID_ROLE");
  }
  if (input.name.trim().length < 2 || input.name.trim().length > 100) throw new AppError("Name must be between 2 and 100 characters.", 400, "INVALID_NAME");
  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new AppError("Enter a valid email address.", 400, "INVALID_EMAIL");
  const phone = input.phone ? normalizePhone(input.phone) : undefined;
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await User.create({
      name: input.name.trim(), email, phone, passwordHash, role: input.role,
      accountStatus: "pending_email", emailVerifiedAt: null,
    });
    if (input.role === "professional") {
      await ProfessionalProfile.create({ userId: user._id, applicationStatus: "draft" });
    }
    let emailSent = false;
    try {
      const challenge = await issueOtp({ userId: String(user._id), email, purpose: "email_verification" });
      await sendOtpEmail({ email, name: user.name, otp: challenge.otp, purpose: "email_verification" });
      emailSent = true;
    } catch (error) {
      // Keep the pending account so the user can request another code. Do not expose provider details.
      console.error("Styler verification email could not be sent", error instanceof Error ? error.message : "unknown error");
    }
    return { user: safeUser(user), emailSent, message: emailSent ? "Check your email for the six-digit verification code." : "Your account is pending email verification. Use resend code after the email service is configured." };
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      const duplicateKey = String((error as { keyPattern?: Record<string, number> }).keyPattern ? Object.keys((error as { keyPattern: Record<string, number> }).keyPattern!)[0] : "account detail");
      throw new AppError(`An account with this ${duplicateKey === "email" ? "email" : duplicateKey === "phone" ? "mobile number" : "detail"} already exists.`, 409, "DUPLICATE_ACCOUNT");
    }
    throw error;
  }
}

export async function resendVerificationCode(emailInput: string): Promise<void> {
  const email = normalizeEmail(emailInput);
  const user = await User.findOne({ email, accountStatus: "pending_email" });
  // Intentionally generic to avoid revealing account existence through the API response.
  if (!user) return;
  const challenge = await issueOtp({ userId: String(user._id), email: user.email, purpose: "email_verification" });
  await sendOtpEmail({ email: user.email, name: user.name, otp: challenge.otp, purpose: "email_verification" });
}

export async function verifyEmailAddress(input: { email: string; otp: string }) {
  const email = normalizeEmail(input.email);
  const user = await User.findOne({ email, accountStatus: "pending_email" });
  if (!user) throw new AppError("The account or verification code is invalid or expired.", 400, "INVALID_VERIFICATION");
  await consumeOtpOrThrow({ userId: String(user._id), purpose: "email_verification", otp: input.otp });
  user.accountStatus = "active";
  user.emailVerifiedAt = new Date();
  await user.save();
  if (user.role === "professional") {
    await ProfessionalProfile.updateOne({ userId: user._id }, { $setOnInsert: { userId: user._id, applicationStatus: "draft" } }, { upsert: true });
  }
  return { user: safeUser(user), nextPath: user.role === "professional" ? "/professional/onboarding" : "/customer/dashboard" };
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: normalizeEmail(input.email) }).select("+passwordHash");
  // Use a single generic credential error for unknown emails and bad passwords.
  if (!user) {
    await burnPasswordCheck(input.password);
    throw new AppError("Email or password is incorrect.", 401, "INVALID_CREDENTIALS");
  }
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError("Email or password is incorrect.", 401, "INVALID_CREDENTIALS");
  }
  if (user.accountStatus === "pending_email") throw new AppError("Verify your email before signing in.", 403, "EMAIL_NOT_VERIFIED");
  if (user.accountStatus !== "active") throw new AppError("This account is not active. Contact Styler support.", 403, "ACCOUNT_NOT_ACTIVE");
  const session = await createSession(String(user._id), {
    authMethod: input.authMethod ?? "web", userAgent: input.userAgent, ipHash: input.ipHash,
  });
  user.lastLoginAt = new Date();
  await user.save();
  let nextPath = "/customer/dashboard";
  if (user.role === "admin") nextPath = "/admin/dashboard";
  if (user.role === "professional") {
    const profile = await ProfessionalProfile.findOne({ userId: user._id }).select("applicationStatus").lean();
    nextPath = profile?.applicationStatus === "approved" ? "/professional/dashboard" : "/professional/onboarding";
  }
  return { user: safeUser(user), session, nextPath };
}

export async function requestPasswordReset(emailInput: string): Promise<void> {
  const user = await User.findOne({ email: normalizeEmail(emailInput), accountStatus: "active" });
  // The endpoint should always return the same generic response whether the email exists or not.
  if (!user) return;
  const challenge = await issueOtp({ userId: String(user._id), email: user.email, purpose: "password_reset" });
  await sendOtpEmail({ email: user.email, name: user.name, otp: challenge.otp, purpose: "password_reset" });
}

export async function completePasswordReset(input: { email: string; otp: string; newPassword: string }): Promise<void> {
  const user = await User.findOne({ email: normalizeEmail(input.email), accountStatus: "active" });
  if (!user) throw new AppError("The code is invalid, expired, or the account cannot be reset.", 400, "INVALID_RESET");
  await consumeOtpOrThrow({ userId: String(user._id), purpose: "password_reset", otp: input.otp });
  user.passwordHash = await hashPassword(input.newPassword);
  user.passwordChangedAt = new Date();
  await user.save();
  await revokeAllUserSessions(String(user._id));
}

export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const tokenInfo = extractSessionToken(request);
  if (!tokenInfo) return null;
  const session = await findActiveSession(tokenInfo.token);
  if (!session) return null;
  const user = await User.findById(session.userId).select("name email role accountStatus").lean();
  if (!user || user.accountStatus !== "active") return null;
  void session.updateOne({ $set: { lastSeenAt: new Date() } }).catch(() => undefined);
  return {
    userId: String(user._id), role: user.role as UserRole, accountStatus: user.accountStatus as AuthenticatedUser["accountStatus"],
    sessionId: String(session._id), authMethod: tokenInfo.authMethod, email: user.email, name: user.name,
  };
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser(request);
  if (!user) throw new AppError("Please sign in to continue.", 401, "UNAUTHENTICATED");
  return user;
}

export async function logoutRequest(request: Request): Promise<boolean> {
  const tokenInfo = extractSessionToken(request);
  return tokenInfo ? revokeSession(tokenInfo.token) : false;
}

export async function getCurrentUserSafe(userId: string) {
  const user = await User.findById(userId).select("name email phone role accountStatus emailVerifiedAt profileImageUrl savedAddresses createdAt updatedAt").lean();
  if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
  return safeUser(user);
}

export function hashIpForLogging(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;
  const pepper = process.env.RATE_LIMIT_PEPPER || process.env.SESSION_SECRET;
  if (!pepper) return undefined;
  return createHash("sha256").update(`${pepper}:${ip}`).digest("hex");
}
