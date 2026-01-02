import axios from "axios";
import crypto from "crypto";
import { getUserByEmail, createUser, getUserByGoogleId, linkGoogleAccount, updateUser } from "./user.service.js";

const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

// Generate Google OAuth authorization URL
export const generateGoogleAuthUrl = () => {
  const state = crypto.randomBytes(32).toString('hex');
  const scope = 'openid email profile';
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.FRONTEND_URL}/auth/callback/google`,
    response_type: 'code',
    scope: scope,
    state: state,
    access_type: 'offline',
    prompt: 'select_account'
  });

  return {
    authUrl: `${GOOGLE_OAUTH_URL}?${params.toString()}`,
    state: state
  };
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code) => {
  try {
    const response = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.FRONTEND_URL}/auth/callback/google`,
    });

    return response.data;
  } catch (error) {
    throw new Error('Failed to exchange code for token: ' + error.message);
  }
};

// Get user info from Google
export const getGoogleUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(`${GOOGLE_USERINFO_URL}?access_token=${accessToken}`);
    return response.data;
  } catch (error) {
    throw new Error('Failed to get user info from Google: ' + error.message);
  }
};

// Handle Google OAuth login/signup
export const handleGoogleAuth = async (googleUser) => {
  try {
    // Check if user already exists with this Google ID
    let user = await getUserByGoogleId(googleUser.id);
    
    if (user) {
      return { 
        user, 
        isNewUser: false,
        needsOnboarding: !user.isOnBoarded 
      };
    }

    // Check if user exists with same email
    user = await getUserByEmail(googleUser.email);
    
    if (user) {
      // Link Google account
      user = await linkGoogleAccount(user._id, googleUser.id);
      
      // Update avatar if user doesn't have one
      if (!user.avatarUrl || user.avatarUrl.includes('basic-avatar.jpg')) {
        user.avatarUrl = googleUser.picture;
        await updateUser(user._id, { avatarUrl: googleUser.picture });
      }
      
      return { 
        user, 
        isNewUser: false,
        needsOnboarding: !user.isOnBoarded 
      };
    }

    // Create new user
    const newUser = await createUser({
      email: googleUser.email,
      googleId: googleUser.id,
      authMethods: ['google'],
      isEmailVerified: true,
      avatarUrl: googleUser.picture || "https://cloudanary.s3.ap-southeast-1.amazonaws.com/basic-avatar.jpg",
      isOnBoarded: false
    });

    return { 
      user: newUser, 
      isNewUser: true,
      needsOnboarding: true 
    };
  } catch (error) {
    throw new Error('Google authentication failed: ' + error.message);
  }
};
