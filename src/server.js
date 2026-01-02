import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";

import { app, server } from "./lib/socket.js";

import connectDB from "./lib/db.js";
import authRoutes from "./routers/auth.route.js";
import userRoutes from "./routers/user.route.js";

const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:3000",
      "http://localhost:80",
      "http://localhost:443",
      "https://localhost:443",
      // Production domain
      "https://app.benjaminluong.id.vn",
      "http://app.benjaminluong.id.vn",
      // EC2 IP patterns
      /^http:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/,
      /^https:\/\/\d+\.\d+\.\d+\.\d+(:\d+)?$/,
    ],
    credentials: true, // Cho phép gửi cookies
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Set-Cookie"],
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health check route
app.get("/", (req, res) => {
  res.status(200).json({ message: "NaVi API is running", status: "healthy" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
    connectDB();
  });
}

export default server;
