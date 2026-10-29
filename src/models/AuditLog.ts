import { Schema, model, models, InferSchemaType } from "mongoose";

export const AuditLogSchema = new Schema(
  {
    actorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorRole: { type: String, required: true, enum: ["customer", "professional", "admin", "system"] },
    action: { type: String, required: true, trim: true, maxlength: 150, index: true },
    targetType: { type: String, required: true, trim: true, maxlength: 100 },
    targetId: { type: String, required: true, trim: true, maxlength: 200 },
    before: { type: Schema.Types.Mixed, default: undefined },
    after: { type: Schema.Types.Mixed, default: undefined },
    metadata: { type: Schema.Types.Mixed, default: {} },
    requestId: { type: String, trim: true, maxlength: 200 },
    ipHash: { type: String, maxlength: 128 },
    userAgent: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "audit_logs", versionKey: false },
);

AuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });

export type AuditLogDocumentShape = InferSchemaType<typeof AuditLogSchema>;
const AuditLog: any = models.AuditLog || model("AuditLog", AuditLogSchema);
export default AuditLog;
