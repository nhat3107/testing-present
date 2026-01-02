import axios from "axios";
import crypto from "crypto";
import {
  getUserByEmail,
  createUser,
  getUserByGithubId,
  linkGithubAccount,
  updateUser,
} from "./user.service.js";

const GITHUB_OAUTH_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails";

// Generate GitHub OAuth authorization URL
export const generateGithubAuthUrl = () => {
  const state = crypto.randomBytes(32).toString("hex");
  const scope = "read:user user:email";

  const params = new URLSearchParams({
    client_id: process.env.GH_CLIENT_ID,
    redirect_uri: `${process.env.FRONTEND_URL}/auth/callback/github`,
    response_type: "code",
    scope: scope,
    state: state,
  });

  return {
    authUrl: `${GITHUB_OAUTH_URL}?${params.toString()}`,
    state: state,
  };
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code) => {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GH_CLIENT_ID,
      client_secret: process.env.GH_CLIENT_SECRET,
      code: code,
      redirect_uri: `${process.env.FRONTEND_URL}/auth/callback/github`,
    });

    const response = await axios.post(GITHUB_TOKEN_URL, params.toString(), {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (response.data.error) {
      const errorMessage =
        response.data.error === "bad_verification_code"
          ? "Authorization code has expired or already been used. Please try signing in again."
          : `GitHub OAuth error: ${
              response.data.error_description || response.data.error
            }`;
      throw new Error(errorMessage);
    }

    if (!response.data.access_token) {
      throw new Error("No access token received from GitHub");
    }

    return response.data;
  } catch (error) {
    throw new Error(
      "Failed to exchange code for token: " +
        (error.response?.data?.error_description || error.message)
    );
  }
};

// Get user info from GitHub
export const getGithubUserInfo = async (accessToken) => {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "NaVi-App",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    // Try Bearer format first
    const userResponse = await axios.get(GITHUB_USER_URL, {
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
    });

    return await processGithubUserData(
      userResponse.data,
      accessToken,
      headers,
      "Bearer"
    );
  } catch (error) {
    // Fallback to token format if Bearer fails
    if (error.response?.status === 401) {
      try {
        const userResponse = await axios.get(GITHUB_USER_URL, {
          headers: {
            ...headers,
            Authorization: `token ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        return await processGithubUserData(
          userResponse.data,
          accessToken,
          { ...headers, Accept: "application/vnd.github.v3+json" },
          "token"
        );
      } catch (retryError) {
        throw new Error(
          "Failed to get user info from GitHub: " + retryError.message
        );
      }
    }
    throw new Error("Failed to get user info from GitHub: " + error.message);
  }
};

// Helper function to process GitHub user data
const processGithubUserData = async (
  userData,
  accessToken,
  headers,
  authType
) => {
  let primaryEmail = userData.email;

  // Get user emails if profile email is private
  if (!primaryEmail) {
    try {
      const emailsResponse = await axios.get(GITHUB_USER_EMAILS_URL, {
        headers: { ...headers, Authorization: `${authType} ${accessToken}` },
      });

      const emails = emailsResponse.data;
      const primaryEmailObj =
        emails.find((email) => email.primary) ||
        emails.find((email) => email.verified) ||
        emails[0];

      if (primaryEmailObj) primaryEmail = primaryEmailObj.email;
    } catch (emailError) {
      // Continue without email if fetch fails
    }
  }

  return {
    id: userData.id.toString(),
    login: userData.login,
    name: userData.name,
    email: primaryEmail,
    avatar_url: userData.avatar_url,
    bio: userData.bio,
  };
};

// Handle GitHub OAuth login/signup
export const handleGithubAuth = async (githubUser) => {
  try {
    // 1. Check if user already exists with this GitHub ID
    let user = await getUserByGithubId(githubUser.id);

    if (user) {
      return {
        user,
        isNewUser: false,
        needsOnboarding: !user.isOnBoarded,
      };
    }

    // 2. Check if user exists with same email
    if (githubUser.email) {
      user = await getUserByEmail(githubUser.email);

      if (user) {
        // Link GitHub account
        user = await linkGithubAccount(user._id, githubUser.id);

        // Update avatar if user doesn't have one
        if (!user.avatarUrl || user.avatarUrl.includes("basic-avatar.jpg")) {
          await updateUser(user._id, { avatarUrl: githubUser.avatar_url });
        }

        return {
          user,
          isNewUser: false,
          needsOnboarding: !user.isOnBoarded,
        };
      }
    }

    // 3. Create new user
    if (!githubUser.email) {
      throw new Error(
        "GitHub account must have a public email or verified email to create account"
      );
    }

    const newUser = await createUser({
      email: githubUser.email,
      githubId: githubUser.id,
      authMethods: ["github"],
      isEmailVerified: true,
      avatarUrl:
        githubUser.avatar_url ||
        "https://cloudanary.s3.ap-southeast-1.amazonaws.com/basic-avatar.jpg",
      bio: githubUser.bio || "",
      isOnBoarded: false,
    });

    return {
      user: newUser,
      isNewUser: true,
      needsOnboarding: true,
    };
  } catch (error) {
    throw new Error("GitHub authentication failed: " + error.message);
  }
};
