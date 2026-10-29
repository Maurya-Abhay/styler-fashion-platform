import { Schema, model, models, InferSchemaType } from "mongoose";

export const SlotReservationSchema = new Schema(
  {
    // One document reserves one 15-minute grid block. Create all blocks for a service window
    // inside a MongoDB transaction. Keep blocks aligned to the configured interval.
    reservationId: { type: String, required: true, index: true, maxlength: 100 },
    professionalId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: true },
    blockStartAt: { type: Date, required: true },
    bookingRequestId: { type: Schema.Types.ObjectId, ref: "BookingRequest", required: true },
    bookingOfferId: { type: Schema.Types.ObjectId, ref: "BookingOffer" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    status: { type: String, required: true, enum: ["held", "confirmed", "released", "expired"], default: "held", index: true },
    expiresAt: { type: Date, default: null, index: true },
    releasedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "slot_reservations" },
);

// Prevent two active reservations for the same professional/time block. Booking services
// must release stale holds and reserve every affected block atomically.
SlotReservationSchema.index(
  { professionalId: 1, blockStartAt: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["held", "confirmed"] } } },
);
SlotReservationSchema.index({ status: 1, expiresAt: 1 });
SlotReservationSchema.index({ reservationId: 1, status: 1 });

export type SlotReservationDocumentShape = InferSchemaType<typeof SlotReservationSchema>;
const SlotReservation: any = models.SlotReservation || model("SlotReservation", SlotReservationSchema);
export default SlotReservation;
