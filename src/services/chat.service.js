import Chat from "../models/Chat.js";

export const getChatService = async (userId) => {
  return await Chat.find({ participants: userId })
    .populate("participants", "username avatarUrl")
    .sort({ lastMessageAt: -1, createdAt: -1 });
};

export const getChatByIdService = async (id) => {
  return await Chat.findById(id).populate("participants", "username avatarUrl");
};

export const createChatService = async (
  participants,
  isGroup = false,
  groupName = ""
) => {
  if (!isGroup) {
    const existing = await Chat.findOne({
      isGroup: false,
      $and: participants.map((p) => ({ participants: p })),
      $expr: { $eq: [{ $size: "$participants" }, participants.length] },
    });
    if (existing) {
      return { chat: existing, existed: true };
    }
  }

  const chat = new Chat({ participants, isGroup, groupName });
  const saved = await chat.save();
  return { chat: saved, existed: false };
};

export const updateLastMessageService = async (chatId) => {
  await Chat.findByIdAndUpdate(chatId, { lastMessageAt: new Date() });
};
