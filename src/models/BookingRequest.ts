import { Schema, model, models, InferSchemaType } from "mongoose";
import { SERVICE_CATEGORY_IDS } from "@/lib/categories";

const ReferenceImageSchema = new Schema(
  {
    fileId: { type: String, trim: true, maxlength: 300 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    caption: { type: String, trim: true, maxlength: 200 },
  },
  { _id: true },
);

const AddressSnapshotSchema = new Schema(
  {
    recipientName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    houseNumber: { type: String, trim: true, maxlength: 100 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200 },
    landmark: { type: String, trim: true, maxlength: 150 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    state: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 12 },
    country: { type: String, required: true, trim: true, default: "India" },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
  },
  { _id: false },
);

export const BookingRequestSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    serviceCategory: {
      type: String,
      required: true,
      enum: SERVICE_CATEGORY_IDS,
      index: true,
    },
    requirements: { type: String, required: true, trim: true, minlength: 10, maxlength: 4000 },
    referenceImages: { type: [ReferenceImageSchema], default: [] },
    addressSnapshot: { type: AddressSnapshotSchema, required: true },
    searchRadiusKm: { type: Number, min: 1, max: 200, default: 25 },
    paymentPreference: { type: String, enum: ["when_accepted", "later"], default: "when_accepted" },
    budgetMinPaise: { type: Number, min: 0, validate: Number.isSafeInteger },
    budgetMaxPaise: { type: Number, min: 0, validate: Number.isSafeInteger },
    preferredStartAt: { type: Date, required: true, index: true },
    preferredEndAt: { type: Date, required: true },
    requestedDurationMinutes: { type: Number, min: 15, max: 1440, default: 60 },
    status: {
      type: String,
      required: true,
      enum: ["matching", "offers_sent", "assigned", "no_match", "expired", "cancelled"],
      default: "matching",
      index: true,
    },
    maxOffers: { type: Number, required: true, min: 1, max: 10, default: 10 },
    offersSentCount: { type: Number, min: 0, max: 10, default: 0 },
    offerDeadlineAt: { type: Date, index: true },
    assignedOfferId: { type: Schema.Types.ObjectId, ref: "BookingOffer", default: null },
    assignedBookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    noMatchReason: { type: String, trim: true, maxlength: 500 },
    submittedAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "booking_requests" },
);

BookingRequestSchema.index({ customerId: 1, createdAt: -1 });
BookingRequestSchema.index({ status: 1, offerDeadlineAt: 1 });
BookingRequestSchema.index({ serviceCategory: 1, status: 1, preferredStartAt: 1 });
BookingRequestSchema.pre("validate", function (this: any, next) {
  if (this.preferredStartAt && this.preferredEndAt && this.preferredEndAt <= this.preferredStartAt) {
    this.invalidate("preferredEndAt", "preferredEndAt must be later than preferredStartAt");
  }
  if (this.budgetMinPaise != null && this.budgetMaxPaise != null && this.budgetMaxPaise < this.budgetMinPaise) {
    this.invalidate("budgetMaxPaise", "budgetMaxPaise must be at least budgetMinPaise");
  }
  next();
});

export type BookingRequestDocumentShape = InferSchemaType<typeof BookingRequestSchema>;
const BookingRequest: any = models.BookingRequest || model("BookingRequest", BookingRequestSchema);
export default BookingRequest;
