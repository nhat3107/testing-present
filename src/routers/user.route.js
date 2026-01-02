import express from "express";
import {
  getProfile,
  updateProfile,
  getUserProfile,
  deleteAvatar,
  followUserController,
  unfollowUserController,
  getFollowers,
  getFollowing,
} from "../controllers/user.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Protected routes - require authentication
router.get("/profile", protectRoute, getProfile);
router.patch("/profile", protectRoute, updateProfile);
router.delete("/avatar", protectRoute, deleteAvatar);

// Follow/Unfollow routes
router.post("/follow/:userId", protectRoute, followUserController);
router.post("/unfollow/:userId", protectRoute, unfollowUserController);

// Get followers and following
router.get("/:userId/followers", protectRoute, getFollowers);
router.get("/:userId/following", protectRoute, getFollowing);

// View user profile (must be last to avoid conflict with other routes)
router.get("/:userId", protectRoute, getUserProfile);

export default router;

