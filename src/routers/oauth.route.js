import express from "express";
import { 
  getGoogleAuthUrl, 
  handleGoogleCallback,
  getGithubAuthUrl, 
  handleGithubCallback 
} from "../controllers/oauth2.controller.js";

const router = express.Router();

// Google OAuth routes
router.get("/google/url", getGoogleAuthUrl);
router.post("/google/callback", handleGoogleCallback);

// GitHub OAuth routes
router.get("/github/url", getGithubAuthUrl);
router.post("/github/callback", handleGithubCallback);

export default router;

