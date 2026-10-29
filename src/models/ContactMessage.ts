import { Schema, model, models, InferSchemaType } from "mongoose";

export const ContactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: {
      type: String,
      required: true,
      enum: ["new", "in_progress", "resolved"],
      default: "new",
      index: true,
    },
    emailDeliveryStatus: {
      type: String,
      required: true,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    emailDeliveryError: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: "contact_messages" },
);

ContactMessageSchema.index({ status: 1, createdAt: -1 });

export type ContactMessageDocumentShape = InferSchemaType<typeof ContactMessageSchema>;
const ContactMessage: any = models.ContactMessage || model("ContactMessage", ContactMessageSchema);
export default ContactMessage;
