import { Schema, model, models, InferSchemaType } from "mongoose";

export const EmailOtpSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    purpose: {
      type: String,
      required: true,
      enum: ["email_verification", "password_reset"],
      index: true,
    },
    // Hash the six-digit code with a server-side secret/pepper; never store the OTP itself.
    otpHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, min: 0, max: 10, default: 0 },
    maxAttempts: { type: Number, min: 1, max: 10, default: 5 },
    sentAt: { type: Date, required: true, default: Date.now },
    consumedAt: { type: Date, default: null },
    invalidatedAt: { type: Date, default: null },
    providerMessageId: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true, collection: "email_otps" },
);

EmailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EmailOtpSchema.index({ userId: 1, purpose: 1, createdAt: -1 });
EmailOtpSchema.index({ email: 1, purpose: 1, createdAt: -1 });

export type EmailOtpDocumentShape = InferSchemaType<typeof EmailOtpSchema>;
const EmailOtp: any = models.EmailOtp || model("EmailOtp", EmailOtpSchema);
export default EmailOtp;
