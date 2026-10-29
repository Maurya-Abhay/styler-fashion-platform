import { Schema, model, models, InferSchemaType } from "mongoose";

export const FinancialLedgerSchema = new Schema(
  {
    transactionGroupId: { type: String, required: true, index: true, maxlength: 200 },
    // Each financial event should create balanced debit/credit rows in one MongoDB transaction.
    accountCode: {
      type: String,
      required: true,
      enum: ["customer_receivable", "platform_revenue", "professional_payable", "gateway_fee_expense", "refund_liability", "tax_payable", "cash_clearing", "adjustment"],
      index: true,
    },
    entrySide: { type: String, required: true, enum: ["debit", "credit"] },
    entryType: {
      type: String,
      required: true,
      enum: ["payment_captured", "commission_earned", "platform_fee_earned", "gateway_fee", "refund_issued", "professional_payout", "payout_reversed", "manual_adjustment"],
      index: true,
    },
    amountPaise: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout" },
    externalReference: { type: String, trim: true, maxlength: 250 },
    idempotencyKey: { type: String, required: true, unique: true, maxlength: 250 },
    description: { type: String, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true, collection: "financial_ledger" },
);

FinancialLedgerSchema.index({ transactionGroupId: 1, createdAt: 1 });
FinancialLedgerSchema.index({ accountCode: 1, occurredAt: -1 });
FinancialLedgerSchema.index({ bookingId: 1, occurredAt: -1 });

export type FinancialLedgerDocumentShape = InferSchemaType<typeof FinancialLedgerSchema>;
const FinancialLedger: any = models.FinancialLedger || model("FinancialLedger", FinancialLedgerSchema);
export default FinancialLedger;
