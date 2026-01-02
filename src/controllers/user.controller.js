import {
  getUserById,
  updateUser,
  getUserByUsername,
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing,
} from "../services/user.service.js";
import cloudinary from "../lib/cloudinary.js";

/**
 * Get current user's profile
 * GET /api/users/profile
 */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Remove sensitive data
    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      authMethods: user.authMethods,
      isEmailVerified: user.isEmailVerified,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isOnBoarded: user.isOnBoarded,
      followers: user.followers,
      following: user.following,
      settings: user.settings,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error("Error in getProfile controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Update current user's profile
 * PATCH /api/users/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, bio, avatarUrl, gender, dateOfBirth, settings } = req.body;

    // Validate that at least one field is being updated
    if (!username && !bio && avatarUrl === undefined && !gender && !dateOfBirth && !settings) {
      return res.status(400).json({
        message: "At least one field must be provided for update",
      });
    }

    // Build update object with only provided fields
    const updateData = {};

    // Check if username is being changed and if it's available
    if (username !== undefined) {
      if (username.trim() === "") {
        return res.status(400).json({
          message: "Username cannot be empty",
        });
      }

      // Check if username is already taken (excluding current user)
      const existingUser = await getUserByUsername(username);
      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res.status(400).json({
          message: "Username already taken",
        });
      }

      updateData.username = username.trim();
    }

    if (bio !== undefined) {
      // Allow empty bio, but trim it
      updateData.bio = bio.trim();
      
      // Optional: Add character limit validation
      if (updateData.bio.length > 500) {
        return res.status(400).json({
          message: "Bio must be 500 characters or less",
        });
      }
    }

    if (avatarUrl !== undefined) {
      // Validate URL format (basic validation)
      if (avatarUrl && !avatarUrl.startsWith("http")) {
        return res.status(400).json({
          message: "Avatar URL must be a valid URL",
        });
      }
      updateData.avatarUrl = avatarUrl;
    }

    if (gender !== undefined) {
      updateData.gender = gender;
    }

    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth;
    }

    if (settings !== undefined) {
      // Validate settings object if provided
      const validThemes = ["light", "dark"];
      const validPrivacy = ["public", "private"];

      if (settings.theme && !validThemes.includes(settings.theme)) {
        return res.status(400).json({
          message: "Invalid theme value. Must be 'light' or 'dark'",
        });
      }

      if (settings.privacy && !validPrivacy.includes(settings.privacy)) {
        return res.status(400).json({
          message: "Invalid privacy value. Must be 'public' or 'private'",
        });
      }

      // Merge settings with existing settings
      updateData.settings = {
        ...req.user.settings,
        ...settings,
      };
    }

    // Update user in database
    const updatedUser = await updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return updated user profile (without sensitive data)
    const userProfile = {
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      authMethods: updatedUser.authMethods,
      isEmailVerified: updatedUser.isEmailVerified,
      gender: updatedUser.gender,
      dateOfBirth: updatedUser.dateOfBirth,
      avatarUrl: updatedUser.avatarUrl,
      bio: updatedUser.bio,
      isOnBoarded: updatedUser.isOnBoarded,
      followers: updatedUser.followers,
      following: updatedUser.following,
      settings: updatedUser.settings,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userProfile,
    });
  } catch (error) {
    console.error("Error in updateProfile controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get user by ID (for viewing other user profiles)
 * GET /api/users/:userId
 */
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return public user data only (exclude sensitive information)
    const userProfile = {
      _id: user._id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isOnBoarded: user.isOnBoarded,
      followers: user.followers,
      following: user.following,
      settings: {
        privacy: user.settings?.privacy || "public",
      },
      createdAt: user.createdAt,
    };

    // If user profile is private, only show limited info unless it's the current user or they're following
    const currentUserId = req.user?._id.toString();
    const isOwnProfile = currentUserId === userId;
    const isFollowing = user.followers?.some(
      (followerId) => followerId.toString() === currentUserId
    );

    if (user.settings?.privacy === "private" && !isOwnProfile && !isFollowing) {
      return res.status(200).json({
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          settings: {
            privacy: "private",
          },
        },
        isPrivate: true,
      });
    }

    res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error("Error in getUserProfile controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Delete user's avatar (reset to default)
 * DELETE /api/users/avatar
 */
export const deleteAvatar = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentUser = await getUserById(userId);

    // If user has a custom avatar from Cloudinary, delete it
    if (
      currentUser.avatarUrl &&
      currentUser.avatarUrl.includes("cloudinary.com") &&
      !currentUser.avatarUrl.includes("basic-avatar.jpg")
    ) {
      // Extract public_id from Cloudinary URL
      const urlParts = currentUser.avatarUrl.split("/");
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = publicIdWithExtension.split(".")[0];

      try {
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.error("Error deleting from Cloudinary:", cloudinaryError);
        // Continue anyway to reset avatar URL
      }
    }

    // Reset avatar to default
    const updatedUser = await updateUser(userId, {
      avatarUrl: "https://cloudanary.s3.ap-southeast-1.amazonaws.com/basic-avatar.jpg",
    });

    res.status(200).json({
      success: true,
      message: "Avatar deleted successfully",
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
    console.error("Error in deleteAvatar controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Follow a user
 * POST /api/users/follow/:userId
 */
export const followUserController = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId: targetUserId } = req.params;

    // Validate that user is not trying to follow themselves
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    // Check if target user exists
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if already following
    const currentUser = await getUserById(currentUserId);
    if (currentUser.following?.some((id) => id.toString() === targetUserId)) {
      return res.status(400).json({
        message: "You are already following this user",
      });
    }

    await followUser(currentUserId, targetUserId);

    res.status(200).json({
      success: true,
      message: "User followed successfully",
    });
  } catch (error) {
    console.error("Error in followUser controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Unfollow a user
 * POST /api/users/unfollow/:userId
 */
export const unfollowUserController = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId: targetUserId } = req.params;

    // Validate that user is not trying to unfollow themselves
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({
        message: "You cannot unfollow yourself",
      });
    }

    // Check if target user exists
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check if currently following
    const currentUser = await getUserById(currentUserId);
    if (!currentUser.following?.some((id) => id.toString() === targetUserId)) {
      return res.status(400).json({
        message: "You are not following this user",
      });
    }

    await unfollowUser(currentUserId, targetUserId);

    res.status(200).json({
      success: true,
      message: "User unfollowed successfully",
    });
  } catch (error) {
    console.error("Error in unfollowUser controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get user's followers
 * GET /api/users/:userId/followers
 */
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    // Check if user exists
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const followers = await getUserFollowers(userId, limit);

    res.status(200).json({
      success: true,
      followers,
      count: followers.length,
    });
  } catch (error) {
    console.error("Error in getFollowers controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get user's following
 * GET /api/users/:userId/following
 */
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    // Check if user exists
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const following = await getUserFollowing(userId, limit);

    res.status(200).json({
      success: true,
      following,
      count: following.length,
    });
  } catch (error) {
    console.error("Error in getFollowing controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

