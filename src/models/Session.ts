import { Schema, model, models, InferSchemaType } from "mongoose";

export const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Store only a cryptographic hash of the opaque session token, never the raw token.
    tokenHash: { type: String, required: true, unique: true, select: false },
    authMethod: { type: String, enum: ["web", "mobile"], required: true, default: "web" },
    userAgent: { type: String, trim: true, maxlength: 500 },
    ipHash: { type: String, maxlength: 128 },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "sessions" },
);

// MongoDB removes expired sessions automatically. Authorization must still check expiresAt/revokedAt.
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export type SessionDocumentShape = InferSchemaType<typeof SessionSchema>;
const Session: any = models.Session || model("Session", SessionSchema);
export default Session;
