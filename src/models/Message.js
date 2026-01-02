import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true, // Index for efficient chat queries
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "call"],
      default: "text",
    },
    content: String,
    // Call-specific fields (only used when type === "call")
    callStatus: {
      type: String,
      enum: ["missed", "completed", "declined", "cancelled", "no-answer"],
      default: null,
    },
    callDuration: {
      type: Number, // Duration in seconds
      default: null,
    },
    callRoomId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient pagination queries on chatId + createdAt
MessageSchema.index({ chatId: 1, createdAt: -1 });

const Message = mongoose.model("Message", MessageSchema);
export default Message;
