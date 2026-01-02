import {
  getUserByEmail,
  createUser,
  updateUser,
  getUserByUsername,
  searchUsersByUsername,
} from "../services/user.service.js";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import TempOTP from "../models/TempOTP.js";
import { sendOTPEmail, sendWelcomeEmail } from "../services/email.service.js";

export const signUp = async (req, res) => {
  const { email, password } = req.body; // Lấy dữ liệu từ frontend
  try {
    // Kiểm tra xem email đã tồn tại chưa (trong User hoặc TempOTP)
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Kiểm tra xem có pending OTP nào không
    const existingOTP = await TempOTP.findOne({ email, verified: false });
    if (existingOTP) {
      return res.status(400).json({
        message:
          "Email verification already in progress. Please check your email or request a new OTP. Go login to continue your verification process.",
        requiresOTPVerification: true,
        email: email,
      });
    }

    const hashedPassword = await bcryptjs.hash(password, 10); // Mã hóa password

    // Tạo OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcryptjs.hash(otp, 10);

    console.log("Creating OTP for email:", email);
    console.log("Generated OTP:", otp); // Log OTP (chỉ cho debug, xóa trong production)

    // Lưu OTP và password tạm thời (10 phút expire) - CHƯA tạo user
    await TempOTP.create({
      email,
      otp: hashedOTP,
      passwordHash: hashedPassword, // Store password hash temporarily
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      attempts: 0,
      verified: false,
    });

    console.log(
      "OTP saved to database, expires at:",
      new Date(Date.now() + 10 * 60 * 1000)
    );

    // Gửi OTP qua email
    await sendOTPEmail(email, otp);
    console.log("OTP email sent successfully");

    // Trả về response yêu cầu verify OTP (User chưa được tạo)
    res.status(201).json({
      success: true,
      message:
        "Please check your email for OTP verification to complete your registration.",
      requiresOTPVerification: true,
      email: email,
    });
  } catch (error) {
    console.log("Error in signUp controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const signIn = async (req, res) => {
  const { email, password } = req.body; // Lấy dữ liệu từ frontend
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Basic password validation (minimum length)
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Kiểm tra xem user đã tồn tại chưa
    const user = await getUserByEmail(email);
    if (!user) {
      // Kiểm tra xem có pending OTP verification không
      const pendingOTP = await TempOTP.findOne({
        email,
        verified: false,
        expiresAt: { $gt: new Date() },
      });

      if (pendingOTP) {
        // Verify password trong TempOTP record
        const isPasswordValid = await bcryptjs.compare(
          password,
          pendingOTP.passwordHash
        );
        if (isPasswordValid) {
          return res.status(400).json({
            message: "Please complete email verification first",
            requiresOTPVerification: true,
            email: email,
          });
        }
      }

      return res.status(400).json({ message: "Invalid password or email" });
    }

    // Check if user has password (OAuth users might not have password)
    if (!user.passwordHash) {
      return res.status(400).json({ 
        message: "This account was created with OAuth. Please use OAuth to sign in." 
      });
    }

    // User tồn tại, verify password
    const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password or email" });
    }

    // Tạo JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "7d",
    });

    // Set JWT cookie with appropriate settings based on environment
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true, // Prevent XSS attacks
      sameSite: isProduction ? "none" : "lax", // Use none for HTTPS in production
      secure: isProduction, // Must be true for HTTPS in production
      path: "/",
    });

    // Trả về user data (không include passwordHash)
    const userResponse = {
      _id: user._id,
      email: user.email,
      username: user.username,
      authMethods: user.authMethods,
      isEmailVerified: user.isEmailVerified,
      isOnBoarded: user.isOnBoarded,
      gender: user.gender,
      dateOfBirth: user.dateOfBirth,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.status(200).json({ success: true, user: userResponse });
  } catch (error) {
    console.error("Error in signIn controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const completeOnboarding = async (req, res) => {
  const userId = req.user._id;
  const profileData = req.body;
  try {
    const existingUsername = await getUserByUsername(profileData.username);
    if (existingUsername) {
      return res.status(400).json({ message: "Username already taken" });
    }
    const user = await updateUser(userId, {
      ...profileData,
      isOnBoarded: true,
    });
    // delete user.passwordHash;
    res.status(200).json({ success: true, user: user });
  } catch (error) {
    console.log("Error in completeOnboarding controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Verify OTP và tạo User + JWT token
export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  try {
    console.log("Verifying OTP for email:", email);
    console.log("OTP received:", otp);

    // Tìm OTP record
    const otpRecord = await TempOTP.findOne({
      email,
      verified: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      console.log("No OTP record found for email:", email);
      // Kiểm tra có OTP record nào không (bất kể verified/expired)
      const anyOTP = await TempOTP.findOne({ email });
      if (anyOTP) {
        console.log("Found OTP but:", {
          verified: anyOTP.verified,
          expired: anyOTP.expiresAt < new Date(),
          expiresAt: anyOTP.expiresAt,
        });
      }
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    console.log("OTP record found, attempts:", otpRecord.attempts);

    // Kiểm tra số lần thử
    if (otpRecord.attempts >= 5) {
      return res.status(400).json({
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    const isOTPValid = await bcryptjs.compare(otp, otpRecord.otp);
    console.log("OTP validation result:", isOTPValid);

    if (!isOTPValid) {
      // Tăng attempts count
      otpRecord.attempts += 1;
      await otpRecord.save();

      console.log("Invalid OTP, attempts now:", otpRecord.attempts);

      return res.status(400).json({
        message: "Invalid OTP",
        attemptsLeft: 5 - otpRecord.attempts,
      });
    }

    console.log("OTP verified successfully!");

    // OTP đúng - Bây giờ mới tạo user
    otpRecord.verified = true;
    await otpRecord.save();

    // Kiểm tra user đã tồn tại chưa (để tránh duplicate)
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Tạo user mới với email đã verified
    const newUser = await createUser({
      email,
      passwordHash: otpRecord.passwordHash, // Lấy password từ TempOTP
      authMethods: ["email"],
      isEmailVerified: true, // Email đã được verify
    });

    // Tạo JWT token
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("jwt", token, {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    // Xóa OTP record sau khi tạo user thành công (cleanup)
    await TempOTP.deleteOne({ _id: otpRecord._id });

    // Gửi welcome email (không chờ kết quả)
    sendWelcomeEmail(email).catch((err) =>
      console.log("Warning: Could not send welcome email:", err.message)
    );

    // Trả về user data (không include passwordHash)
    const userResponse = {
      _id: newUser._id,
      email: newUser.email,
      authMethods: newUser.authMethods,
      isEmailVerified: newUser.isEmailVerified,
      isOnBoarded: newUser.isOnBoarded,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    res.status(200).json({
      success: true,
      message: "Email verified and account created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.log("Error in verifyOTP controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    console.log("Resending OTP for email:", email);

    // Kiểm tra user đã được tạo chưa (nếu có nghĩa là đã verified rồi)
    const user = await getUserByEmail(email);
    if (user) {
      return res.status(400).json({
        message:
          "Email already verified and account created. Please sign in instead.",
      });
    }

    // Kiểm tra xem có pending OTP record không (bỏ qua expired)
    let existingOTP = await TempOTP.findOne({ email, verified: false });

    // Nếu OTP đã expire hoặc không tồn tại, tạo mới
    if (!existingOTP || existingOTP.expiresAt < new Date()) {
      console.log("OTP expired or not found, creating new signup session");
      return res.status(400).json({
        message:
          "Your previous verification session has expired. Please sign up again to receive a new OTP.",
        requiresNewSignup: true,
      });
    }

    // Kiểm tra rate limiting (không cho resend nếu mới tạo trong 1 phút)
    const timeElapsed = Date.now() - existingOTP.createdAt.getTime();
    if (timeElapsed < 60 * 1000) {
      // 1 minute
      const remainingTime = Math.ceil((60 * 1000 - timeElapsed) / 1000);
      return res.status(400).json({
        message: "Please wait before requesting a new OTP",
        waitTime: remainingTime, // seconds
      });
    }

    // Tạo OTP mới
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcryptjs.hash(otp, 10);

    console.log("Resending new OTP:", otp); // Debug log

    // Update existing OTP record với OTP mới
    existingOTP.otp = hashedOTP;
    existingOTP.attempts = 0; // Reset attempts
    existingOTP.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Reset expiry
    existingOTP.createdAt = new Date(); // Update created time for rate limiting
    await existingOTP.save();

    console.log("OTP updated, new expiry:", existingOTP.expiresAt);

    // Gửi OTP qua email
    await sendOTPEmail(email, otp);

    console.log("New OTP email sent successfully");

    res.status(200).json({
      success: true,
      message: "New OTP sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.log("Error in resendOTP controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });
    res.status(200).json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Error in logout controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Search users by username
export const searchUsers = async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    const currentUserId = req.user._id;

    if (!searchTerm || searchTerm.trim().length < 2) {
      return res.status(400).json({
        message: "Search term must be at least 2 characters long",
      });
    }

    const users = await searchUsersByUsername(
      searchTerm.trim(),
      currentUserId,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error) {
    console.log("Error in searchUsers controller", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
