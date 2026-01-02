import {
  getMessagesService,
  sendMessageService,
} from "../services/message.service.js";
import { io } from "../lib/socket.js";
import cloudinary from "../lib/cloudinary.js";

export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 30, before } = req.query;
    
    // Validate limit to prevent excessive queries
    const validLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
    
    const messages = await getMessagesService(chatId, { 
      limit: validLimit, 
      before 
    });
    
    if (!messages) {
      return res.status(404).json({ message: "Messages not found" });
    }
    
    res.json({ 
      messages,
      hasMore: messages.length >= validLimit,
      count: messages.length 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to fetch messages",
      error: error.message 
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { message: payload } = req.body;
    const chatId = payload?.chatId || req.body.chatId;
    const type = payload?.type || req.body.type || "text";
    const content = payload?.content || req.body.content;
    const senderId = req.user?._id;
    
    if (!chatId || !senderId) {
      return res.status(400).json({ 
        message: "Missing required fields: chatId or senderId" 
      });
    }
    
    const message = await sendMessageService(chatId, senderId, type, content);
    
    if (!message) {
      return res.status(400).json({ message: "Failed to send message" });
    }
    
    // Emit to all users in the chat room
    io.to(String(chatId)).emit("new-message", message);
    
    res.status(201).json({ 
      message: "Message sent successfully", 
      message 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to send message",
      error: error.message 
    });
  }
};

export async function signUpload(req, res) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const folder = "navi_storage";
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    process.env.CLOUDINARY_API_SECRET
  );
  res.json({
    timestamp,
    signature,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
