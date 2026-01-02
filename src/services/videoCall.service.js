import VideoCall from "../models/VideoCall.js";
import axios from "axios";
import jwt from "jsonwebtoken";

const VIDEOSDK_API_ENDPOINT = "https://api.videosdk.live";
const VIDEOSDK_API_KEY = process.env.VIDEOSDK_API_KEY;
const VIDEOSDK_SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY;

// Generate VideoSDK token
export const generateVideoSDKToken = async () => {
  try {
    // Check if environment variables are set
    if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET_KEY) {
      console.error("❌ VideoSDK API keys are not configured!");
      console.error(
        "Please add VIDEOSDK_API_KEY and VIDEOSDK_SECRET_KEY to your .env file"
      );
      console.error("Get your keys from: https://app.videosdk.live/");
      throw new Error(
        "VideoSDK API keys are not configured. Please check your .env file."
      );
    }

    // VideoSDK requires JWT token with API key and secret
    const options = {
      expiresIn: "24h",
      algorithm: "HS256",
    };

    const payload = {
      apikey: VIDEOSDK_API_KEY,
      permissions: ["allow_join", "allow_mod"], // permissions for token
    };

    const token = jwt.sign(payload, VIDEOSDK_SECRET_KEY, options);
    return token;
  } catch (error) {
    console.error("Error generating VideoSDK token:", error);
    throw error;
  }
};

// Create new VideoSDK room
export const createVideoSDKRoom = async (token) => {
  try {
    const url = `${VIDEOSDK_API_ENDPOINT}/v2/rooms`;
    const options = {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      timeout: 10000, // 10 seconds timeout
    };

    const response = await axios.post(url, {}, options);
    const data = response.data;

    if (data.roomId) {
      return { roomId: data.roomId, err: null };
    } else {
      const errorMsg = data.error || data.message || "Unknown error from VideoSDK";
      console.error("VideoSDK API error response:", data);
      return { roomId: null, err: errorMsg };
    }
  } catch (error) {
    console.error("Error creating VideoSDK room:", error);
    
    // Provide more detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorMsg = error.response.data?.error || 
                      error.response.data?.message || 
                      `VideoSDK API error: ${error.response.status} ${error.response.statusText}`;
      return { roomId: null, err: errorMsg };
    } else if (error.request) {
      // The request was made but no response was received
      return { roomId: null, err: "No response from VideoSDK API. Please check your network connection." };
    } else {
      // Something happened in setting up the request that triggered an Error
      return { roomId: null, err: error.message || "Failed to create video room" };
    }
  }
};

// Validate VideoSDK room
export const validateVideoSDKRoom = async (roomId, token) => {
  try {
    const url = `${VIDEOSDK_API_ENDPOINT}/v2/rooms/validate/${roomId}`;
    const options = {
      method: "GET",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.get(url, options);

    if (response.status === 400) {
      const data = response.data;
      return { roomId: null, err: data };
    }

    const data = response.data;

    if (data.roomId) {
      return { roomId: data.roomId, err: null };
    } else {
      return { roomId: null, err: data.error };
    }
  } catch (error) {
    console.error("Error validating VideoSDK room:", error);
    return { roomId: null, err: error.message };
  }
};

// Create new call in database
export const createCall = async (initiatorId, participantIds, roomId) => {
  const call = new VideoCall({
    roomId,
    participants: [initiatorId], // Only add initiator, others will join later
    invitedParticipants: participantIds, // Save list of invited participants
    startedAt: new Date(),
    status: "active",
  });
  return await call.save();
};

// Add participant
export const joinCall = async (roomId, userId) => {
  const call = await VideoCall.findOneAndUpdate(
    { roomId, status: "active" },
    { $addToSet: { participants: userId } },
    { new: true }
  );
  if (!call) throw new Error("Call not found or already ended");
  return call;
};

// Leave call
export const leaveCall = async (roomId, userId) => {
  const call = await VideoCall.findOneAndUpdate(
    { roomId },
    { $pull: { participants: userId } },
    { new: true }
  );
  return call;
};

// End call
export const endCall = async (roomId) => {
  return await VideoCall.findOneAndUpdate(
    { roomId },
    { status: "ended", endedAt: new Date() },
    { new: true }
  );
};

// Get call by roomId
export const getCallByRoomId = async (roomId) => {
  return await VideoCall.findOne({ roomId });
};

// Get user's call history
export const getUserCallHistory = async (userId) => {
  return await VideoCall.find({ participants: userId })
    .populate("participants", "username avatarUrl fullName")
    .sort({ createdAt: -1 })
    .limit(20);
};
