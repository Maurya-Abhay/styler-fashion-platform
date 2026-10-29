import { Schema, model, models, InferSchemaType } from "mongoose";
import { SERVICE_CATEGORY_IDS } from "@/lib/categories";

const PortfolioImageSchema = new Schema(
  {
    fileId: { type: String, trim: true, maxlength: 300 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    altText: { type: String, trim: true, maxlength: 200 },
    sortOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true },
);

const ProfessionalDocumentSchema = new Schema(
  {
    documentType: {
      type: String,
      required: true,
      enum: ["identity_proof", "address_proof", "professional_certificate", "business_registration", "other"],
    },
    // Prefer a private storage key/file ID over a permanently public document URL.
    storageKey: { type: String, required: true, trim: true, maxlength: 500 },
    originalFileName: { type: String, trim: true, maxlength: 255 },
    mimeType: { type: String, trim: true, maxlength: 100 },
    sizeBytes: { type: Number, min: 0, max: 25000000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewReason: { type: String, trim: true, maxlength: 1000 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { _id: true, timestamps: true },
);

const ServiceAreaSchema = new Schema(
  {
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCodes: { type: [String], default: [] },
    radiusKm: { type: Number, min: 1, max: 200 },
  },
  { _id: false },
);

const PayoutAccountSchema = new Schema(
  {
    provider: { type: String, enum: ["razorpay_route"], default: "razorpay_route" },
    providerAccountId: { type: String, trim: true, maxlength: 200 },
    status: { type: String, enum: ["not_started", "pending", "verified", "restricted", "rejected"], default: "not_started" },
    verifiedAt: { type: Date },
  },
  { _id: false },
);

export const ProfessionalProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    slug: { type: String, trim: true, lowercase: true, maxlength: 160, unique: true, sparse: true },
    displayName: { type: String, trim: true, maxlength: 120 },
    bio: { type: String, trim: true, maxlength: 3000 },
    profilePhoto: { fileId: { type: String, trim: true }, url: { type: String, trim: true, maxlength: 2048 } },
    portfolioImages: { type: [PortfolioImageSchema], default: [] },
    experienceYears: { type: Number, min: 0, max: 80, default: 0 },
    categories: {
      type: [String],
      enum: SERVICE_CATEGORY_IDS,
      default: [],
    },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 12 },
    serviceAreas: { type: [ServiceAreaSchema], default: [] },
    baseLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    documents: { type: [ProfessionalDocumentSchema], default: [] },
    applicationStatus: {
      type: String,
      required: true,
      enum: ["draft", "pending_review", "needs_changes", "approved", "rejected", "suspended"],
      default: "draft",
      index: true,
    },
    applicationSubmittedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date, default: null },
    reviewReason: { type: String, trim: true, maxlength: 1500 },
    commissionOverridePercent: { type: Number, min: 0, max: 100, default: undefined },
    payoutAccount: { type: PayoutAccountSchema, default: () => ({}) },
  },
  { timestamps: true, collection: "professional_profiles" },
);

ProfessionalProfileSchema.index({ applicationStatus: 1, createdAt: -1 });
ProfessionalProfileSchema.index({ city: 1, applicationStatus: 1 });
ProfessionalProfileSchema.index({ categories: 1, applicationStatus: 1 });

export type ProfessionalProfileDocumentShape = InferSchemaType<typeof ProfessionalProfileSchema>;
const ProfessionalProfile: any = models.ProfessionalProfile || model("ProfessionalProfile", ProfessionalProfileSchema);
export default ProfessionalProfile;
