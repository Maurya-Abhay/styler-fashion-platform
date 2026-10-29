import { Schema, model, models, InferSchemaType } from "mongoose";

const TimeIntervalSchema = new Schema(
  {
    // Minutes after midnight: 600 = 10:00 AM, 1080 = 6:00 PM.
    startMinute: { type: Number, required: true, min: 0, max: 1439 },
    endMinute: {
      type: Number,
      required: true,
      min: 1,
      max: 1440,
      validate: {
        validator: function (this: { startMinute?: number }, value: number) {
          return this.startMinute == null || value > this.startMinute;
        },
        message: "endMinute must be later than startMinute",
      },
    },
  },
  { _id: false },
);

const WeeklyDaySchema = new Schema(
  {
    weekday: { type: Number, required: true, min: 0, max: 6 }, // Sunday = 0
    isClosed: { type: Boolean, default: false },
    intervals: { type: [TimeIntervalSchema], default: [] },
  },
  { _id: false },
);

const ExceptionSchema = new Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    type: { type: String, required: true, enum: ["closed", "custom_hours", "blocked_intervals"] },
    intervals: { type: [TimeIntervalSchema], default: [] },
    note: { type: String, trim: true, maxlength: 300 },
  },
  { _id: true },
);

export const AvailabilitySchema = new Schema(
  {
    professionalId: { type: Schema.Types.ObjectId, ref: "ProfessionalProfile", required: true, unique: true },
    timezone: { type: String, required: true, default: "Asia/Kolkata", maxlength: 100 },
    acceptingRequests: { type: Boolean, default: false, index: true },
    slotIntervalMinutes: { type: Number, required: true, enum: [15, 30, 60], default: 15 },
    maxAdvanceBookingDays: { type: Number, min: 1, max: 180, default: 30 },
    weeklySchedule: { type: [WeeklyDaySchema], default: [] },
    exceptions: { type: [ExceptionSchema], default: [] },
    lastScheduleUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "availabilities" },
);

AvailabilitySchema.index({ acceptingRequests: 1, updatedAt: -1 });

export type AvailabilityDocumentShape = InferSchemaType<typeof AvailabilitySchema>;
const Availability: any = models.Availability || model("Availability", AvailabilitySchema);
export default Availability;
