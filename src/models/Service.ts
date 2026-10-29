import { Schema, model, models, InferSchemaType } from "mongoose";
import { SERVICE_CATEGORY_IDS } from "@/lib/categories";

const ServiceImageSchema = new Schema(
  {
    fileId: { type: String, trim: true, maxlength: 300 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    altText: { type: String, trim: true, maxlength: 200 },
    sortOrder: { type: Number, min: 0, default: 0 },
  },
  { _id: true },
);

const isSafePaise = (value: number) => Number.isSafeInteger(value) && value >= 0;

export const ServiceSchema = new Schema(
  {
    professionalId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: true, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    category: {
      type: String,
      required: true,
      enum: SERVICE_CATEGORY_IDS,
      index: true,
    },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 140 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    pricingType: { type: String, required: true, enum: ["fixed", "starting_from", "quote_required"], default: "fixed" },
    pricePaise: {
      type: Number,
      min: 0,
      validate: { validator: isSafePaise, message: "pricePaise must be a non-negative integer" },
      required: function (this: { pricingType?: string }) { return this.pricingType !== "quote_required"; },
    },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    durationMinutes: { type: Number, required: true, min: 15, max: 1440 },
    travelBufferMinutes: { type: Number, min: 0, max: 240, default: 15 },
    images: { type: [ServiceImageSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "services" },
);

ServiceSchema.index({ professionalId: 1, slug: 1 }, { unique: true });
ServiceSchema.index({ category: 1, isActive: 1, createdAt: -1 });
ServiceSchema.index({ professionalId: 1, isActive: 1 });

export type ServiceDocumentShape = InferSchemaType<typeof ServiceSchema>;
const Service: any = models.Service || model("Service", ServiceSchema);
export default Service;
