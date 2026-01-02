import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String }, // Optional - OAuth users won't have password

    // OAuth Integration
    googleId: { type: String, unique: true, sparse: true },
    githubId: { type: String, unique: true, sparse: true },
    authMethods: [
      {
        type: String,
        enum: ["email", "google", "github"],
        default: ["email"],
      },
    ],
    isEmailVerified: { type: Boolean, default: false },

    // Profile fields
    gender: { type: String, default: "" },
    dateOfBirth: { type: String, default: "" },
    avatarUrl: {
      type: String,
      default:
        "https://cloudanary.s3.ap-southeast-1.amazonaws.com/basic-avatar.jpg",
    },
    bio: { type: String, default: "" },
    isOnBoarded: { type: Boolean, default: false },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    settings: {
      theme: { type: String, default: "light" },
      language: { type: String, default: "en" },
      privacy: { type: String, enum: ["public", "private"], default: "public" },
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
export default User;
