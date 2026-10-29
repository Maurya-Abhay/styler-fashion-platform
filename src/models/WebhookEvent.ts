import { Schema, model, models, InferSchemaType } from "mongoose";

export const WebhookEventSchema = new Schema(
  {
    provider: { type: String, required: true, enum: ["razorpay"], default: "razorpay" },
    eventId: { type: String, required: true, trim: true, maxlength: 250 },
    eventType: { type: String, required: true, trim: true, maxlength: 150 },
    payloadHash: { type: String, required: true, maxlength: 200 },
    status: { type: String, required: true, enum: ["received", "processing", "processed", "failed"], default: "received", index: true },
    attemptCount: { type: Number, min: 0, default: 0 },
    receivedAt: { type: Date, required: true, default: Date.now },
    processedAt: { type: Date, default: null },
    lastError: { type: String, trim: true, maxlength: 2000 },
    // Store only minimal, sanitized diagnostic details; do not persist secrets/raw headers.
    sanitizedSummary: { type: Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true, collection: "webhook_events" },
);

WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
WebhookEventSchema.index({ status: 1, receivedAt: 1 });

export type WebhookEventDocumentShape = InferSchemaType<typeof WebhookEventSchema>;
const WebhookEvent: any = models.WebhookEvent || model("WebhookEvent", WebhookEventSchema);
export default WebhookEvent;
