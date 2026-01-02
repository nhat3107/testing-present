import Message from "../models/Message.js";
import { updateLastMessageService } from "./chat.service.js";

export const getMessagesService = async (
  chatId,
  { limit = 30, before } = {}
) => {
  const query = { chatId };
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  // Optimize query with lean() for better performance
  // Sort descending (newest first), then reverse to get ascending order
  const docs = await Message.find(query)
    .populate("senderId", "username avatarUrl")
    .sort({ createdAt: -1 }) // Get newest first
    .limit(Number(limit))
    .lean(); // Convert to plain JS objects for better performance

  // Reverse to return oldest-to-newest order
  // This ensures consistent ordering: [oldest...newest]
  return docs.reverse();
};

export const sendMessageService = async (chatId, senderId, type, content) => {
  const message = new Message({ chatId, senderId, type, content });
  await message.save();
  await updateLastMessageService(chatId);
  const populatedMessage = await message.populate(
    "senderId",
    "username avatarUrl"
  );
  return populatedMessage;
};

export const createCallMessageService = async (
  chatId,
  senderId,
  callStatus,
  callRoomId,
  callDuration = null
) => {
  const message = new Message({
    chatId,
    senderId,
    type: "call",
    content: null,
    callStatus,
    callRoomId,
    callDuration,
  });
  await message.save();
  await updateLastMessageService(chatId);
  const populatedMessage = await message.populate(
    "senderId",
    "username avatarUrl"
  );
  return populatedMessage;
};