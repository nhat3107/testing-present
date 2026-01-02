import User from "../models/User.js";

export const createUser = async (userData) => {
  const user = await User.create(userData);
  return user;
};

export const getUserByEmail = async (email) => {
  const user = await User.findOne(
    { email },
    {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
      googleId: true,
      githubId: true,
      authMethods: true,
      isEmailVerified: true,
      gender: true,
      dateOfBirth: true,
      avatarUrl: true,
      bio: true,
      isOnBoarded: true,
      followers: true,
      following: true,
      settings: true,
    }
  ).lean();
  return user;
};

export const getUserById = async (userId) => {
  const user = await User.findById(userId, {
    id: true,
    username: true,
    email: true,
    passwordHash: true,
    googleId: true,
    githubId: true,
    authMethods: true,
    isEmailVerified: true,
    gender: true,
    dateOfBirth: true,
    avatarUrl: true,
    bio: true,
    isOnBoarded: true,
    followers: true,
    following: true,
    settings: true,
  }).lean();
  return user;
};

export const updateUser = async (userId, profileData) => {
  const user = await User.findByIdAndUpdate(userId, profileData, { new: true });
  return user;
};

export const getUserByUsername = async (username) => {
  const user = await User.findOne({ username }, { id: true, username: true });
  return user;
};

// Google OAuth functions
export const getUserByGoogleId = async (googleId) => {
  const user = await User.findOne(
    { googleId },
    {
      id: true,
      username: true,
      email: true,
      googleId: true,
      githubId: true,
      authMethods: true,
      isEmailVerified: true,
      gender: true,
      dateOfBirth: true,
      avatarUrl: true,
      bio: true,
      isOnBoarded: true,
      followers: true,
      following: true,
      settings: true,
    }
  ).lean();
  return user;
};

export const linkGoogleAccount = async (userId, googleId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      googleId: googleId,
      $addToSet: { authMethods: "google" },
      isEmailVerified: true,
    },
    { new: true }
  );
  return user;
};

// GitHub OAuth functions
export const getUserByGithubId = async (githubId) => {
  const user = await User.findOne(
    { githubId },
    {
      id: true,
      username: true,
      email: true,
      googleId: true,
      githubId: true,
      authMethods: true,
      isEmailVerified: true,
      gender: true,
      dateOfBirth: true,
      avatarUrl: true,
      bio: true,
      isOnBoarded: true,
      followers: true,
      following: true,
      settings: true,
    }
  ).lean();
  return user;
};

export const linkGithubAccount = async (userId, githubId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      githubId: githubId,
      $addToSet: { authMethods: "github" },
      isEmailVerified: true,
    },
    { new: true }
  );
  return user;
};

// Search users by username
export const searchUsersByUsername = async (
  searchTerm,
  currentUserId,
  limit = 10
) => {
  const users = await User.find({
    username: { $regex: searchTerm, $options: "i" },
    _id: { $ne: currentUserId }, // Exclude current user
    isOnBoarded: true, // Only return onboarded users
  })
    .select("username avatarUrl bio")
    .limit(limit)
    .lean();

  return users;
};

// Follow a user
export const followUser = async (currentUserId, targetUserId) => {
  // Add targetUser to current user's following
  await User.findByIdAndUpdate(currentUserId, {
    $addToSet: { following: targetUserId },
  });

  // Add currentUser to target user's followers
  await User.findByIdAndUpdate(targetUserId, {
    $addToSet: { followers: currentUserId },
  });

  return { success: true };
};

// Unfollow a user
export const unfollowUser = async (currentUserId, targetUserId) => {
  // Remove targetUser from current user's following
  await User.findByIdAndUpdate(currentUserId, {
    $pull: { following: targetUserId },
  });

  // Remove currentUser from target user's followers
  await User.findByIdAndUpdate(targetUserId, {
    $pull: { followers: currentUserId },
  });

  return { success: true };
};

// Get user's followers with populated data
export const getUserFollowers = async (userId, limit = 20) => {
  const user = await User.findById(userId)
    .select("followers")
    .populate("followers", "username avatarUrl bio")
    .limit(limit)
    .lean();

  return user?.followers || [];
};

// Get user's following with populated data
export const getUserFollowing = async (userId, limit = 20) => {
  const user = await User.findById(userId)
    .select("following")
    .populate("following", "username avatarUrl bio")
    .limit(limit)
    .lean();

  return user?.following || [];
};