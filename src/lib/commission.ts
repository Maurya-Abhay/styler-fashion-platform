import PlatformSettings from "@/models/PlatformSettings";
import ProfessionalProfile from "@/models/ProfessionalProfile";
import type { MoneyBreakdown } from "@/types";
import { AppError } from "@/types";

export async function getPlatformSettings() {
  let settings = await PlatformSettings.findOne({ key: "default" });
  if (!settings) {
    try { settings = await PlatformSettings.create({ key: "default" }); }
    catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      settings = await PlatformSettings.findOne({ key: "default" });
    }
  }
  if (!settings) throw new Error("Could not load Styler platform settings.");
  return settings;
}

export function percentAmountPaise(amountPaise: number, percent: number): number {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) throw new AppError("Amount must be a non-negative integer in paise.", 400, "INVALID_AMOUNT");
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new AppError("Percentage must be between 0 and 100.", 400, "INVALID_PERCENTAGE");
  const basisPoints = BigInt(Math.round(percent * 100));
  const amount = BigInt(amountPaise);
  // Round to the nearest paise; all financial storage remains integer paise.
  const result = (amount * basisPoints + 5000n) / 10000n;
  const numeric = Number(result);
  if (!Number.isSafeInteger(numeric)) throw new AppError("Calculated amount exceeds the safe limit.", 400, "AMOUNT_OVERFLOW");
  return numeric;
}

export async function getCommissionPercent(professionalProfileId: string): Promise<number> {
  const profile = await ProfessionalProfile.findById(professionalProfileId).select("commissionOverridePercent").lean();
  if (!profile) throw new AppError("Professional profile not found.", 404, "PROFESSIONAL_NOT_FOUND");
  if (typeof profile.commissionOverridePercent === "number") return profile.commissionOverridePercent;
  const settings = await getPlatformSettings();
  return settings.defaultCommissionPercent;
}

export async function calculatePriceBreakdown(input: {
  servicePricePaise: number;
  professionalProfileId: string;
  applyCustomerFee?: boolean;
  discountPaise?: number;
  taxPaise?: number;
}): Promise<MoneyBreakdown> {
  const settings = await getPlatformSettings();
  const commissionPercent = await getCommissionPercent(input.professionalProfileId);
  const servicePricePaise = input.servicePricePaise;
  const discountPaise = input.discountPaise ?? 0;
  const taxPaise = input.taxPaise ?? 0;
  if (![servicePricePaise, discountPaise, taxPaise].every((v) => Number.isSafeInteger(v) && v >= 0)) {
    throw new AppError("All amounts must be non-negative integer paise values.", 400, "INVALID_AMOUNT");
  }
  if (discountPaise > servicePricePaise) throw new AppError("Discount cannot exceed service price.", 400, "INVALID_DISCOUNT");
  let customerPlatformFeePaise = 0;
  if (input.applyCustomerFee !== false && settings.customerPlatformFeeEnabled) {
    customerPlatformFeePaise = settings.customerPlatformFeeType === "percentage"
      ? percentAmountPaise(servicePricePaise, settings.customerPlatformFeePercent)
      : settings.customerPlatformFeePaise;
  }
  const commissionPaise = percentAmountPaise(servicePricePaise - discountPaise, commissionPercent);
  const totalPaise = servicePricePaise - discountPaise + customerPlatformFeePaise + taxPaise;
  const professionalPayoutPaise = servicePricePaise - discountPaise - commissionPaise;
  if (professionalPayoutPaise < 0 || !Number.isSafeInteger(totalPaise)) throw new AppError("Pricing calculation is invalid.", 400, "INVALID_PRICING");
  return {
    servicePricePaise, customerPlatformFeePaise, discountPaise, taxPaise, totalPaise,
    commissionPercent, commissionPaise, professionalPayoutPaise, currency: "INR", settingsVersion: settings.settingsVersion,
  };
}

export async function updatePlatformSettings(input: {
  actorUserId: string;
  defaultCommissionPercent?: number;
  customerPlatformFeeEnabled?: boolean;
  customerPlatformFeeType?: "fixed" | "percentage";
  customerPlatformFeePaise?: number;
  customerPlatformFeePercent?: number;
  maxOffersPerRequest?: number;
  offerWindowMinutes?: number;
  paymentHoldMinutes?: number;
  maxAdvanceBookingDays?: number;
  defaultTravelBufferMinutes?: number;
  cancellationPolicy?: Record<string, unknown>;
}) {
  const settings = await getPlatformSettings();
  const patch: Record<string, unknown> = { updatedBy: input.actorUserId, settingsVersion: settings.settingsVersion + 1 };
  for (const key of [
    "defaultCommissionPercent", "customerPlatformFeeEnabled", "customerPlatformFeeType", "customerPlatformFeePaise",
    "customerPlatformFeePercent", "maxOffersPerRequest", "offerWindowMinutes", "paymentHoldMinutes",
    "maxAdvanceBookingDays", "defaultTravelBufferMinutes",
  ] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  if (input.cancellationPolicy !== undefined) {
    patch.cancellationPolicy = {
      customerFreeCancellationMinutesBefore: input.cancellationPolicy.customerFreeCancellationMinutesBefore ?? settings.cancellationPolicy.customerFreeCancellationMinutesBefore,
      professionalCancellationAllowed: input.cancellationPolicy.professionalCancellationAllowed ?? settings.cancellationPolicy.professionalCancellationAllowed,
      refundMode: input.cancellationPolicy.refundMode ?? settings.cancellationPolicy.refundMode,
    };
  }
  return PlatformSettings.findOneAndUpdate({ key: "default", settingsVersion: settings.settingsVersion }, { $set: patch }, { new: true, runValidators: true });
}
