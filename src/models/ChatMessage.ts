import { Schema, model, models, InferSchemaType } from "mongoose";

export const ChatMessageSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, required: true, enum: ["customer", "professional"] },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "chat_messages", versionKey: false },
);

ChatMessageSchema.index({ bookingId: 1, createdAt: 1 });

export type ChatMessageDocumentShape = InferSchemaType<typeof ChatMessageSchema>;
const ChatMessage: any = models.ChatMessage || model("ChatMessage", ChatMessageSchema);
export default ChatMessage;
