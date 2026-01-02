import mongoose from "mongoose";

const VideoCallSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Người đã tham gia
    invitedParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Người được mời
    startedAt: Date,
    endedAt: Date,
    status: { type: String, enum: ["active", "ended"], default: "active" },
  },
  { timestamps: true }
);

const VideoCall = mongoose.model("VideoCall", VideoCallSchema);
export default VideoCall;
