import { Schema, model, models, InferSchemaType } from "mongoose";

const CancellationPolicySchema = new Schema(
  {
    customerFreeCancellationMinutesBefore: { type: Number, min: 0, max: 10080, default: 1440 },
    professionalCancellationAllowed: { type: Boolean, default: true },
    refundMode: { type: String, enum: ["full_before_cutoff", "manual_review"], default: "full_before_cutoff" },
  },
  { _id: false },
);

export const PlatformSettingsSchema = new Schema(
  {
    // Keep one singleton record with key = "default".
    key: { type: String, required: true, unique: true, default: "default", immutable: true },
    settingsVersion: { type: Number, required: true, min: 1, default: 1 },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    defaultCommissionPercent: { type: Number, required: true, min: 0, max: 100, default: 12 },
    customerPlatformFeeEnabled: { type: Boolean, default: false },
    customerPlatformFeeType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    customerPlatformFeePaise: { type: Number, min: 0, default: 0, validate: Number.isSafeInteger },
    customerPlatformFeePercent: { type: Number, min: 0, max: 100, default: 0 },
    maxOffersPerRequest: { type: Number, required: true, min: 1, max: 10, default: 10 },
    offerWindowMinutes: { type: Number, required: true, min: 1, max: 10, default: 10 },
    paymentHoldMinutes: { type: Number, required: true, min: 1, max: 60, default: 10 },
    maxAdvanceBookingDays: { type: Number, min: 1, max: 180, default: 30 },
    defaultTravelBufferMinutes: { type: Number, min: 0, max: 240, default: 15 },
    cancellationPolicy: { type: CancellationPolicySchema, default: () => ({}) },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "platform_settings" },
);

export type PlatformSettingsDocumentShape = InferSchemaType<typeof PlatformSettingsSchema>;
const PlatformSettings: any = models.PlatformSettings || model("PlatformSettings", PlatformSettingsSchema);
export default PlatformSettings;
