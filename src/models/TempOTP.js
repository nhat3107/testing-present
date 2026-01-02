import mongoose from "mongoose";

const TempOTPSchema = new mongoose.Schema({
  email: { type: String, required: true,index: true },
  otp: { type: String, required: true }, // Hashed OTP
  passwordHash: { type: String, required: true }, // Store password hash temporarily until verification
  attempts: { type: Number, default: 0,max: 5 },
  expiresAt: { type: Date, required: true,index: { expireAfterSeconds: 0 } }, //Tự động xóa khi hết hạn Mongo TTL
  verified: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

// Index để query nhanh hơn
TempOTPSchema.index({ email: 1, verified: 1 });

const TempOTP = mongoose.model("TempOTP", TempOTPSchema);
export default TempOTP;
