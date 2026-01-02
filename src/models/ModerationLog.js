import mongoose from "mongoose";

const ModerationLogSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      enum: ["post", "message", "video"],
      required: true,
    },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    aiResult: {
      nsfw: Boolean,
      violence: Boolean,
      confidence: Number,
      rawScores: Object,
    },
    decidedAction: {
      type: String,
      enum: ["allow", "block", "review"],
      default: "review",
    },
  },
  { timestamps: true }
);

const ModerationLog = mongoose.model("ModerationLog", ModerationLogSchema);
export default ModerationLog;
