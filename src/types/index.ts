import type { Types } from "mongoose";
import type { SERVICE_CATEGORY_IDS } from "@/lib/categories";

export type UserRole = "customer" | "professional" | "admin";
export type AccountStatus = "pending_email" | "active" | "suspended" | "disabled";
export type AuthMethod = "web" | "mobile";
export type OtpPurpose = "email_verification" | "password_reset";
export type ServiceCategory = typeof SERVICE_CATEGORY_IDS[number];
export type ProfessionalApplicationStatus =
  | "draft"
  | "pending_review"
  | "needs_changes"
  | "approved"
  | "rejected"
  | "suspended";
export type BookingRequestStatus = "matching" | "offers_sent" | "assigned" | "no_match" | "expired" | "cancelled";
export type BookingOfferStatus = "sent" | "accepted" | "rejected" | "expired" | "closed";
export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "payment_failed"
  | "disputed";
export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refund_pending"
  | "partially_refunded"
  | "refunded";
export type PayoutStatus = "pending" | "on_hold" | "processing" | "refund_pending" | "transferred" | "failed" | "reversed" | "cancelled" | "review_required";

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  accountStatus: AccountStatus;
  sessionId: string;
  authMethod: AuthMethod;
  email: string;
  name: string;
}

export interface AddressInput {
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface ImageKitAuthParameters {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

export interface MoneyBreakdown {
  servicePricePaise: number;
  customerPlatformFeePaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  commissionPercent: number;
  commissionPaise: number;
  professionalPayoutPaise: number;
  currency: "INR";
  settingsVersion: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
  requestId?: string;
}

export type IdLike = string | Types.ObjectId;
export interface PaginationInput { page?: number; limit?: number; }
export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;
  constructor(message: string, statusCode = 400, code = "APP_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
