import { Schema, model, models, InferSchemaType } from "mongoose";

const DeviceTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expoPushToken: { type: String, required: true, trim: true, maxlength: 200 },
    platform: { type: String, required: true, enum: ["ios", "android"] },
    deviceId: { type: String, trim: true, maxlength: 200 },
    isActive: { type: Boolean, default: true, index: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "device_tokens" },
);

DeviceTokenSchema.index({ expoPushToken: 1 }, { unique: true });
DeviceTokenSchema.index({ userId: 1, isActive: 1 });

export type DeviceTokenDocumentShape = InferSchemaType<typeof DeviceTokenSchema>;
const DeviceToken: any = models.DeviceToken || model("DeviceToken", DeviceTokenSchema);
export default DeviceToken;
