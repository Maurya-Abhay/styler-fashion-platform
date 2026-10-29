import { Schema, model, models, InferSchemaType } from "mongoose";

const DeliverySchema = new Schema(
  {
    channel: { type: String, required: true, enum: ["email", "web_push" ] },
    status: { type: String, required: true, enum: ["queued", "sending", "sent", "delivered", "failed", "skipped"], default: "queued" },
    providerMessageId: { type: String, trim: true, maxlength: 250 },
    attemptCount: { type: Number, min: 0, default: 0 },
    attemptedAt: { type: Date },
    leaseUntil: { type: Date },
    deliveredAt: { type: Date },
    lastError: { type: String, trim: true, maxlength: 1000 },
  },
  { _id: false },
);

export const NotificationSchema = new Schema(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "booking_request_received", "booking_offer_accepted", "booking_offer_closed",
        "booking_confirmed", "booking_cancelled", "booking_started", "booking_completed",
        "payment_success", "payment_failed", "refund_updated", "application_status",
        "payout_status", "review_received", "system_message",
      ],
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    data: { type: Schema.Types.Mixed, default: {} },
    channels: { type: [String], enum: ["in_app", "email", "web_push"], default: ["in_app"] },
    deliveries: { type: [DeliverySchema], default: [] },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String, trim: true, maxlength: 250 },
  },
  { timestamps: true, collection: "notifications" },
);

NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });
NotificationSchema.index({ recipientUserId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
NotificationSchema.index({ "deliveries.status": 1, "deliveries.attemptedAt": 1, createdAt: 1 });

export type NotificationDocumentShape = InferSchemaType<typeof NotificationSchema>;
const Notification: any = models.Notification || model("Notification", NotificationSchema);
export default Notification;
