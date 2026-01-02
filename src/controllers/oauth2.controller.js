import jwt from "jsonwebtoken";
import {
  generateGoogleAuthUrl,
  exchangeCodeForToken,
  getGoogleUserInfo,
  handleGoogleAuth,
} from "../services/google-oauth.service.js";
import {
  generateGithubAuthUrl,
  exchangeCodeForToken as exchangeGithubCodeForToken,
  getGithubUserInfo,
  handleGithubAuth,
} from "../services/github-oauth.service.js";

// Generate Google OAuth URL
export const getGoogleAuthUrl = async (req, res) => {
  try {
    const { authUrl, state } = generateGoogleAuthUrl();

    res.cookie("oauth_state", state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      sameSite: "lax",
      secure: false,
      path: "/",
    });

    res.status(200).json({ success: true, authUrl, state });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Handle Google OAuth callback
export const handleGoogleCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is required" });
    }

    const storedState = req.cookies.oauth_state;
    if (state && storedState && state !== storedState) {
      return res.status(400).json({ message: "Invalid state parameter" });
    }

    const tokenData = await exchangeCodeForToken(code);
    const googleUser = await getGoogleUserInfo(tokenData.access_token);
    const { user, isNewUser, needsOnboarding } = await handleGoogleAuth(
      googleUser
    );

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });

    res.clearCookie("oauth_state", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });

    const userResponse = { ...user };
    delete userResponse.passwordHash;

    res.status(200).json({
      success: true,
      user: userResponse,
      isNewUser,
      needsOnboarding,
      message: isNewUser ? "Account created successfully" : "Login successful",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Google authentication failed",
    });
  }
};

// Generate GitHub OAuth URL
export const getGithubAuthUrl = async (req, res) => {
  try {
    const { authUrl, state } = generateGithubAuthUrl();

    res.cookie("oauth_state", state, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      sameSite: "lax",
      secure: false,
      path: "/",
    });

    res.status(200).json({ success: true, authUrl, state });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Handle GitHub OAuth callback
export const handleGithubCallback = async (req, res) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return res
        .status(400)
        .json({ message: "Authorization code is required" });
    }

    const storedState = req.cookies.oauth_state;
    if (state && storedState && state !== storedState) {
      return res.status(400).json({ message: "Invalid state parameter" });
    }

    const tokenData = await exchangeGithubCodeForToken(code);
    const githubUser = await getGithubUserInfo(tokenData.access_token);
    const { user, isNewUser, needsOnboarding } = await handleGithubAuth(
      githubUser
    );

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });

    res.clearCookie("oauth_state", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });

    const userResponse = { ...user };
    delete userResponse.passwordHash;

    res.status(200).json({
      success: true,
      user: userResponse,
      isNewUser,
      needsOnboarding,
      message: isNewUser ? "Account created successfully" : "Login successful",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "GitHub authentication failed",
    });
  }
};
