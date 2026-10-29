import { Schema, model, models, InferSchemaType } from "mongoose";

const AttemptSchema = new Schema(
  {
    attemptNumber: { type: Number, required: true, min: 1 },
    attemptedAt: { type: Date, required: true, default: Date.now },
    providerTransferId: { type: String, trim: true, maxlength: 200 },
    status: { type: String, required: true, enum: ["processing", "transferred", "failed", "reversed"] },
    failureReason: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

export const PayoutSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: true, index: true },
    provider: { type: String, enum: ["razorpay_route"], default: "razorpay_route" },
    providerAccountId: { type: String, trim: true, maxlength: 200 },
    providerTransferId: { type: String, trim: true, maxlength: 200, unique: true, sparse: true },
    grossAmountPaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    commissionPaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    amountPaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    status: {
      type: String,
      required: true,
      enum: ["pending", "on_hold", "processing", "refund_pending", "transferred", "failed", "reversed", "cancelled", "review_required"],
      default: "pending",
      index: true,
    },
    availableAt: { type: Date, index: true },
    transferredAt: { type: Date, default: null },
    failureReason: { type: String, trim: true, maxlength: 1000 },
    refundHoldPreviousStatus: { type: String, enum: ["pending", "on_hold", "failed"] },
    refundIdempotencyKey: { type: String, trim: true, maxlength: 200 },
    attempts: { type: [AttemptSchema], default: [] },
  },
  { timestamps: true, collection: "payouts" },
);

PayoutSchema.index({ professionalId: 1, status: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, availableAt: 1 });

export type PayoutDocumentShape = InferSchemaType<typeof PayoutSchema>;
const Payout: any = models.Payout || model("Payout", PayoutSchema);
export default Payout;
