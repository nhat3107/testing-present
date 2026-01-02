import express from "express";
import {
  signUp,
  signIn,
  completeOnboarding,
  logout,
  verifyOTP,
  resendOTP,
  searchUsers,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/onboarding", protectRoute, completeOnboarding);
router.post("/logout", logout);

// check if user is logged in
router.get("/me", protectRoute, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// search users by username
router.get("/search", protectRoute, searchUsers);

export default router;
