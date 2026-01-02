import express from "express";
import * as videoCallController from "../controllers/videoCall.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Get VideoSDK token
router.get("/token", videoCallController.getVideoSDKToken);

// Create new room
router.post("/create", videoCallController.createRoom);

// Validate and join room
router.post("/join/:roomId", videoCallController.validateAndJoinRoom);

// Leave call
router.post("/leave/:roomId", videoCallController.leaveCall);

// End call
router.post("/end/:roomId", videoCallController.endCall);

// Get call history
router.get("/history", videoCallController.getCallHistory);

export default router;

