import { Schema, model, models, InferSchemaType } from "mongoose";

const isSafePaise = (value: number) => Number.isSafeInteger(value) && value >= 0;

const RefundSchema = new Schema(
  {
    razorpayRefundId: { type: String, trim: true, maxlength: 200 },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 200 },
    amountPaise: { type: Number, required: true, min: 1, validate: isSafePaise },
    reason: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, required: true, enum: ["pending", "processed", "failed"], default: "pending" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date },
    failureReason: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: true },
);

export const PaymentSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, required: true, enum: ["razorpay"], default: "razorpay" },
    razorpayOrderId: { type: String, trim: true, maxlength: 200, unique: true, sparse: true },
    razorpayPaymentId: { type: String, trim: true, maxlength: 200, unique: true, sparse: true },
    idempotencyKey: { type: String, required: true, unique: true, maxlength: 200 },
    amountPaise: { type: Number, required: true, min: 1, validate: isSafePaise },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    status: {
      type: String,
      required: true,
      enum: ["created", "authorized", "captured", "failed", "refund_pending", "partially_refunded", "refunded"],
      default: "created",
      index: true,
    },
    method: { type: String, trim: true, maxlength: 50 },
    signatureVerifiedAt: { type: Date, default: null },
    capturedAt: { type: Date, default: null },
    failureCode: { type: String, trim: true, maxlength: 100 },
    failureDescription: { type: String, trim: true, maxlength: 1000 },
    refunds: { type: [RefundSchema], default: [] },
    lastProviderEventAt: { type: Date, default: null },
    // Bumped transactionally when a payout worker claims the right to send money.
    // Refund reservation changes the same document, serializing the two operations.
    payoutProcessingVersion: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "payments" },
);

// Only one non-failed payment attempt may be active for a booking. This prevents two
// parallel checkout requests from creating two chargeable Razorpay orders.
PaymentSchema.index(
  { bookingId: 1 },
  {
    // Explicit name: a plain {bookingId:1} index shares the default name and would
    // otherwise conflict with (and silently prevent) this unique partial index.
    name: "uniq_active_payment_per_booking",
    unique: true,
    partialFilterExpression: {
      status: { $in: ["created", "authorized", "captured", "refund_pending", "partially_refunded"] },
    },
  },
);
PaymentSchema.index({ bookingId: 1, createdAt: -1 });
PaymentSchema.index({ customerId: 1, status: 1, capturedAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ "refunds.razorpayRefundId": 1 }, { sparse: true });
PaymentSchema.index({ "refunds.idempotencyKey": 1 }, { unique: true, sparse: true });

export type PaymentDocumentShape = InferSchemaType<typeof PaymentSchema>;
const Payment: any = models.Payment || model("Payment", PaymentSchema);
export default Payment;
