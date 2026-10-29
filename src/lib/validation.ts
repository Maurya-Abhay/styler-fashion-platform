import { z } from "zod";
import { AppError } from "@/types";
import { SERVICE_CATEGORY_IDS } from "@/lib/categories";

/** http(s) URLs only: z.string().url() also accepts javascript:, data: and file: schemes. */
export const httpUrlSchema = z.string().url().max(2048).refine((value) => /^https?:\/\//i.test(value), "Only http(s) URLs are allowed.");

export const userRoleSchema = z.enum(["customer", "professional"]); // Public registration must never accept admin.
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const phoneSchema = z.string().trim().transform((value) => value.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Use international phone format, e.g. +919876543210."));
export const passwordSchema = z.string().min(8).max(128).refine((value) => !/\s/.test(value), "Password must not contain spaces.");
export const otpSchema = z.string().regex(/^\d{6}$/, "Enter the six-digit code.");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  phone: phoneSchema.optional(),
  password: passwordSchema,
  confirmPassword: z.string(),
  role: userRoleSchema,
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const verifyEmailSchema = z.object({ email: emailSchema, otp: otpSchema });
export const resendOtpSchema = z.object({ email: emailSchema });
export const resetPasswordSchema = z.object({ email: emailSchema, otp: otpSchema, newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

export const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(150).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(4).max(12),
  country: z.string().trim().max(100).default("India"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).refine(
  (value) => (value.latitude === undefined) === (value.longitude === undefined),
  { path: ["latitude"], message: "Both coordinates are required for location-based matching." },
);

export const serviceCategorySchema = z.enum(SERVICE_CATEGORY_IDS);
export const bookingRequestSchema = z.object({
  serviceCategory: serviceCategorySchema,
  requirements: z.string().trim().min(10).max(4000),
  referenceImages: z.array(z.object({ fileId: z.string().max(300).optional(), url: httpUrlSchema, caption: z.string().max(200).optional() })).max(10).default([]),
  addressSnapshot: addressSchema,
  searchRadiusKm: z.number().int().min(1).max(200).default(25),
  budgetMinPaise: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  budgetMaxPaise: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  preferredStartAt: z.coerce.date(),
  preferredEndAt: z.coerce.date(),
  requestedDurationMinutes: z.number().int().min(15).max(1440).default(60),
}).refine((value) => value.preferredEndAt > value.preferredStartAt, { path: ["preferredEndAt"], message: "End of the preferred time window must be after its start." })
  .refine((value) => value.budgetMinPaise == null || value.budgetMaxPaise == null || value.budgetMaxPaise >= value.budgetMinPaise, { path: ["budgetMaxPaise"], message: "Maximum budget must be at least minimum budget." });

export const serviceSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  category: serviceCategorySchema,
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(1).max(4000),
  pricingType: z.enum(["fixed", "starting_from", "quote_required"]).default("fixed"),
  pricePaise: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  durationMinutes: z.number().int().min(15).max(1440),
  travelBufferMinutes: z.number().int().min(0).max(240).default(15),
  images: z.array(z.object({ fileId: z.string().max(300).optional(), url: httpUrlSchema, altText: z.string().max(200).optional(), sortOrder: z.number().int().min(0).optional() })).max(20).default([]),
}).refine((value) => value.pricingType === "quote_required" || value.pricePaise !== undefined, { path: ["pricePaise"], message: "A price is required for fixed or starting-from pricing." });

const intervalSchema = z.object({ startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440) })
  .refine((value) => value.endMinute > value.startMinute, { path: ["endMinute"], message: "End must be later than start." });
export const availabilitySchema = z.object({
  timezone: z.string().trim().min(1).max(100).default("Asia/Kolkata"),
  acceptingRequests: z.boolean().default(false),
  slotIntervalMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]).default(15),
  maxAdvanceBookingDays: z.number().int().min(1).max(180).default(30),
  weeklySchedule: z.array(z.object({ weekday: z.number().int().min(0).max(6), isClosed: z.boolean().default(false), intervals: z.array(intervalSchema).max(12).default([]) })).max(7),
  exceptions: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), type: z.enum(["closed", "custom_hours", "blocked_intervals"]), intervals: z.array(intervalSchema).max(12).default([]), note: z.string().max(300).optional() })).max(400).default([]),
});

export const reviewSchema = z.object({ bookingId: z.string().regex(/^[a-f\d]{24}$/i), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(2000).default("") });
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });

export type RegisterPayload = z.infer<typeof registerSchema>;
export type BookingRequestPayload = z.infer<typeof bookingRequestSchema>;
export type ServicePayload = z.infer<typeof serviceSchema>;
export type AvailabilityPayload = z.infer<typeof availabilitySchema>;

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("Request validation failed.", 400, "VALIDATION_ERROR", parsed.error.flatten());
  }
  return parsed.data;
}
