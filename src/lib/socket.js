import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
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
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// User to socket mapping for online presence
const userSocketMap = new Map(); // userId -> socketId

// Call timeout tracking
const callTimeouts = new Map(); // roomId -> { timeout, callerId, participants, chatId, timestamp }

io.on("connection", (socket) => {
  // User authentication - client should send userId after connecting
  socket.on("user-connected", (userId) => {
    if (userId) {
      userSocketMap.set(userId, socket.id);
      socket.userId = userId;
    }
  });

  // Join a chat room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  // Leave a chat room
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);
  });

  // Video call events
  socket.on(
    "call:initiate",
    ({ roomId, callerId, callerName, participants, chatId }) => {
      // Notify all participants about the incoming call (KHÔNG notify cho caller)
      participants.forEach((participantId) => {
        // Không gửi notification cho chính người gọi
        if (participantId === callerId) {
          return;
        }

        const participantSocketId = userSocketMap.get(participantId);
        if (participantSocketId) {
          io.to(participantSocketId).emit("call:incoming", {
            roomId,
            callerId,
            callerName,
            timestamp: Date.now(),
          });
        }
      });

      // Set timeout: If no one joins within 30 seconds, notify caller
      const CALL_TIMEOUT = 30000; // 30 seconds
      const timeoutId = setTimeout(async () => {
        // Notify caller specifically that call timed out
        const callerSocketId = userSocketMap.get(callerId);
        if (callerSocketId) {
          io.to(callerSocketId).emit("call:timeout", {
            roomId,
            chatId,
            timestamp: Date.now(),
          });
        }

        // Clean up timeout tracking
        callTimeouts.delete(roomId);
      }, CALL_TIMEOUT);

      // Store timeout info
      callTimeouts.set(roomId, {
        timeout: timeoutId,
        callerId,
        participants,
        chatId,
        timestamp: Date.now(),
      });
    }
  );

  // User joined video call
  socket.on("call:joined", ({ roomId, userId }) => {
    socket.join(`call:${roomId}`);

    // Clear timeout ONLY if someone OTHER than the caller joined
    const callTimeout = callTimeouts.get(roomId);
    if (callTimeout) {
      const { callerId } = callTimeout;

      // Only clear timeout if a receiver (not the caller) joined
      if (userId !== callerId) {
        clearTimeout(callTimeout.timeout);
        callTimeouts.delete(roomId);
      }
    }

    // Notify others in the call
    socket.to(`call:${roomId}`).emit("call:user-joined", {
      userId,
      timestamp: Date.now(),
    });
  });

  // User left video call
  socket.on("call:left", ({ roomId, userId }) => {
    socket.leave(`call:${roomId}`);

    // Notify others in the call
    socket.to(`call:${roomId}`).emit("call:user-left", {
      userId,
      timestamp: Date.now(),
    });
  });

  // Call ended
  socket.on("call:end", ({ roomId, callerId }) => {
    // Clear timeout if exists
    const callTimeout = callTimeouts.get(roomId);
    if (callTimeout) {
      clearTimeout(callTimeout.timeout);
      callTimeouts.delete(roomId);
    }

    // Notify all participants
    io.to(`call:${roomId}`).emit("call:ended", {
      roomId,
      endedBy: callerId,
      timestamp: Date.now(),
    });
  });

  // User is busy (already in another call)
  socket.on("call:busy", ({ roomId, callerId, busyUserId, busyUserName }) => {
    // Notify the caller that the user is busy
    const callerSocketId = userSocketMap.get(callerId);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call:user-busy", {
        roomId,
        busyUserId,
        busyUserName,
        timestamp: Date.now(),
      });
    }
  });

  // User declined the call
  socket.on("call:declined", async ({ roomId, callerId }) => {
    // Clear timeout if exists
    const callTimeout = callTimeouts.get(roomId);
    if (callTimeout) {
      clearTimeout(callTimeout.timeout);
      const { chatId } = callTimeout;
      callTimeouts.delete(roomId);

      // Notify caller that call was declined
      const callerSocketId = userSocketMap.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call:declined", {
          roomId,
          timestamp: Date.now(),
        });
      }
    }
  });

  // Disconnect event
  socket.on("disconnect", () => {
    // Remove from user-socket map
    if (socket.userId) {
      userSocketMap.delete(socket.userId);
    }
  });
});

export { io, app, server };
