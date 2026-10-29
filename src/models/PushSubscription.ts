import { Schema, model, models, InferSchemaType } from "mongoose";

export const PushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true, unique: true, maxlength: 3000 },
    keys: {
      p256dh: { type: String, required: true, maxlength: 500 },
      auth: { type: String, required: true, maxlength: 500 },
    },
    userAgent: { type: String, trim: true, maxlength: 500 },
    expirationTime: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
    lastUsedAt: { type: Date, default: null },
    lastFailureAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "push_subscriptions" },
);

PushSubscriptionSchema.index({ userId: 1, isActive: 1 });

export type PushSubscriptionDocumentShape = InferSchemaType<typeof PushSubscriptionSchema>;
const PushSubscription: any = models.PushSubscription || model("PushSubscription", PushSubscriptionSchema);
export default PushSubscription;
