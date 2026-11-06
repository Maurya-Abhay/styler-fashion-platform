import { deleteModel, Schema, model, models, type InferSchemaType } from "mongoose";

export const ServiceCategorySchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
      maxlength: 120,
    },
    name: { type: String, trim: true, minlength: 2, maxlength: 100 },
    label: { type: String, trim: true, minlength: 2, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    displayOrder: { type: Number, min: 0, max: 100000, default: 0 },
    image: { type: String, trim: true, maxlength: 2048, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "service_categories" },
);

ServiceCategorySchema.pre("validate", function () {
  const legacyDocument = this as typeof this & { label?: string };
  if (!legacyDocument.name && legacyDocument.label) legacyDocument.name = legacyDocument.label;
  if (!legacyDocument.label && legacyDocument.name) legacyDocument.label = legacyDocument.name;
});

ServiceCategorySchema.index({ slug: 1 }, { unique: true });
ServiceCategorySchema.index({ isActive: 1, displayOrder: 1, name: 1 });

export type ServiceCategoryDocument = InferSchemaType<typeof ServiceCategorySchema>;
if (process.env.NODE_ENV === "development" && models.ServiceCategory?.schema.path("group")) {
  deleteModel("ServiceCategory");
}

const ServiceCategory = models.ServiceCategory || model("ServiceCategory", ServiceCategorySchema);
export default ServiceCategory;
