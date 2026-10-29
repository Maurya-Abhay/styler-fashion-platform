import { Schema, model, models, InferSchemaType } from "mongoose";

export const ReviewSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5, validate: Number.isInteger },
    comment: { type: String, trim: true, maxlength: 2000, default: "" },
    status: { type: String, required: true, enum: ["published", "hidden", "flagged"], default: "published", index: true },
    professionalReply: { type: String, trim: true, maxlength: 2000 },
    professionalRepliedAt: { type: Date },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    moderatedAt: { type: Date },
  },
  { timestamps: true, collection: "reviews" },
);

ReviewSchema.index({ professionalId: 1, status: 1, createdAt: -1 });

export type ReviewDocumentShape = InferSchemaType<typeof ReviewSchema>;
const Review: any = models.Review || model("Review", ReviewSchema);
export default Review;
