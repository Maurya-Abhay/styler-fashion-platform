import { Schema, model, models, InferSchemaType } from "mongoose";

const SavedAddressSchema = new Schema(
  {
    label: { type: String, trim: true, maxlength: 40, default: "Home" },
    recipientName: { type: String, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 20 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    landmark: { type: String, trim: true, maxlength: 150 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
    country: { type: String, required: true, trim: true, default: "India" },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

export const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    // Store normalized phone numbers in E.164 format, e.g. +919876543210.
    // The number is optional and not verified in V1.
    phone: {
      type: String,
      trim: true,
      match: /^\+[1-9]\d{7,14}$/,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      required: true,
      enum: ["customer", "professional", "admin"],
      default: "customer",
      index: true,
    },
    accountStatus: {
      type: String,
      required: true,
      enum: ["pending_email", "active", "suspended", "disabled"],
      default: "pending_email",
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null }, // Reserved for later phone verification.
    profileImageUrl: { type: String, trim: true, maxlength: 2048 },
    savedAddresses: { type: [SavedAddressSchema], default: [] },
    favoriteProfessionalIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "ProfessionalProfile" }],
      default: [],
    },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "users" },
);

UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, accountStatus: 1, createdAt: -1 });

export type UserDocumentShape = InferSchemaType<typeof UserSchema>;
const User: any = models.User || model("User", UserSchema);
export default User;
