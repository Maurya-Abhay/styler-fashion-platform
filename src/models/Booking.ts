import { Schema, model, models, InferSchemaType } from "mongoose";

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

const ServiceSnapshotSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 1000 },
    durationMinutes: { type: Number, required: true, min: 15, max: 1440 },
    travelBufferMinutes: { type: Number, min: 0, max: 240, default: 15 },
  },
  { _id: false },
);

const PriceSnapshotSchema = new Schema(
  {
    servicePricePaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    customerPlatformFeePaise: { type: Number, min: 0, default: 0, validate: Number.isSafeInteger },
    discountPaise: { type: Number, min: 0, default: 0, validate: Number.isSafeInteger },
    taxPaise: { type: Number, min: 0, default: 0, validate: Number.isSafeInteger },
    totalPaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    commissionPercent: { type: Number, required: true, min: 0, max: 100 },
    commissionPaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    professionalPayoutPaise: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    settingsVersion: { type: Number, min: 1, default: 1 },
  },
  { _id: false },
);

const StatusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true, maxlength: 500 },
    changedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const ProfessionalUpdateSchema = new Schema(
  {
    message: { type: String, required: true, trim: true, maxlength: 300 },
    etaMinutes: { type: Number, min: 0, max: 1440 },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  { _id: true },
);

const ProfessionalLocationPointSchema = new Schema(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    sharedAt: { type: Date, required: true },
  },
  { _id: false },
);

export const BookingSchema = new Schema(
  {
    bookingRequestId: { type: Schema.Types.ObjectId, ref: "BookingRequest", required: true, unique: true },
    bookingOfferId: { type: Schema.Types.ObjectId, ref: "BookingOffer", required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    addressSnapshot: { type: AddressSnapshotSchema, required: true },
    serviceSnapshot: { type: ServiceSnapshotSchema, required: true },
    priceSnapshot: { type: PriceSnapshotSchema, required: true },
    paymentPreference: { type: String, enum: ["when_accepted", "later"], default: "when_accepted" },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending_payment", "confirmed", "in_progress", "completed", "cancelled", "payment_failed", "disputed"],
      default: "pending_payment",
      index: true,
    },
    paymentDueAt: { type: Date, index: true },
    confirmedAt: { type: Date, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancellationReason: { type: String, trim: true, maxlength: 1000 },
    // Immutable policy outcome snapshot, so a failed external refund can be retried
    // after cancellation without re-evaluating rules that may have changed later.
    refundRequired: { type: Boolean, default: false },
    refundReviewRequired: { type: Boolean, default: false },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    professionalUpdates: { type: [ProfessionalUpdateSchema], default: [] },
    professionalLiveLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      sharedAt: { type: Date },
    },
    professionalLocationStartedAt: { type: Date },
    professionalLocationHistory: { type: [ProfessionalLocationPointSchema], default: [] },
    reviewId: { type: Schema.Types.ObjectId, ref: "Review", default: null },
  },
  { timestamps: true, collection: "bookings" },
);

BookingSchema.index({ customerId: 1, createdAt: -1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ professionalId: 1, status: 1, startAt: 1 });
BookingSchema.index({ status: 1, paymentDueAt: 1 });
BookingSchema.pre("validate", function (this: any, next) {
  if (this.startAt && this.endAt && this.endAt <= this.startAt) {
    this.invalidate("endAt", "endAt must be later than startAt");
  }
  next();
});

export type BookingDocumentShape = InferSchemaType<typeof BookingSchema>;
const Booking: any = models.Booking || model("Booking", BookingSchema);
export default Booking;
