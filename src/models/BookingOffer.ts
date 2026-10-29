import { Schema, model, models, InferSchemaType } from "mongoose";

const isSafePaise = (value: number) => Number.isSafeInteger(value) && value >= 0;

export const BookingOfferSchema = new Schema(
  {
    bookingRequestId: { type: Schema.Types.ObjectId, ref: "BookingRequest", required: true, index: true },
    professionalId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "Service", required: true },
    quotedPricePaise: { type: Number, required: true, min: 0, validate: isSafePaise },
    customerFeePaise: { type: Number, min: 0, default: 0, validate: isSafePaise },
    commissionPercent: { type: Number, required: true, min: 0, max: 100 },
    commissionPaise: { type: Number, required: true, min: 0, validate: isSafePaise },
    professionalPayoutPaise: { type: Number, required: true, min: 0, validate: isSafePaise },
    settingsVersion: { type: Number, required: true, min: 1, default: 1 },
    currency: { type: String, required: true, enum: ["INR"], default: "INR" },
    proposedStartAt: { type: Date, required: true },
    proposedEndAt: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["sent", "accepted", "rejected", "expired", "closed"],
      default: "sent",
      index: true,
    },
    sentAt: { type: Date, required: true, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    respondedAt: { type: Date, default: null },
    closeReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, collection: "booking_offers" },
);

// One professional receives at most one offer for each customer request.
BookingOfferSchema.index({ bookingRequestId: 1, professionalId: 1 }, { unique: true });
BookingOfferSchema.index({ professionalId: 1, status: 1, expiresAt: 1 });
BookingOfferSchema.index({ bookingRequestId: 1, status: 1 });
BookingOfferSchema.pre("validate", function (this: any, next) {
  if (this.proposedStartAt && this.proposedEndAt && this.proposedEndAt <= this.proposedStartAt) {
    this.invalidate("proposedEndAt", "proposedEndAt must be later than proposedStartAt");
  }
  next();
});

export type BookingOfferDocumentShape = InferSchemaType<typeof BookingOfferSchema>;
const BookingOffer: any = models.BookingOffer || model("BookingOffer", BookingOfferSchema);
export default BookingOffer;
