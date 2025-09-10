import mongoose from "mongoose";

// Each participant references a User _id
const ParticipantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
  },
  { _id: false } // Don't create separate _id for each participant
);

const ConversationSchema = new mongoose.Schema(
  {
    title: { type: String }, // optional, for groups
    isGroup: { type: Boolean, default: false },
    participants: [ParticipantSchema], // array of users
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },
  { timestamps: true }
);

// Index to quickly find conversations where a user participates
ConversationSchema.index({ "participants.userId": 1 });

export default mongoose.model("Conversation", ConversationSchema);
