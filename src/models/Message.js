import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId, // Reference User _id
      ref: "User",
      required: true,
    },
    kind: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    text: { type: String },
    mediaUrl: { type: String },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId, // Array of User _id
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// Compound index: fetch messages by conversation, newest first
MessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.model("Message", MessageSchema);
