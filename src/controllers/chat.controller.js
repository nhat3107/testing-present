import {
  getChatService,
  createChatService,
  getChatByIdService,
} from "../services/chat.service.js";

export const getChats = async (req, res) => {
  const chats = await getChatService(req.user._id);
  if (!chats) {
    return res.status(404).json({ message: "Chats not found" });
  }
  res.json({ message: "Chats fetched successfully", chats });
};

export const createChat = async (req, res) => {
  try {
    const { participants = [], isGroup = false, groupName = "" } = req.body;
    const currentUserId = String(req.user._id);
    const cleanOthers = participants
      .map((p) => String(p))
      .filter((p) => p && p !== "undefined" && p !== currentUserId);
    const uniqueParticipants = Array.from(
      new Set([currentUserId, ...cleanOthers])
    );

    if (isGroup) {
      if (uniqueParticipants.length < 3) {
        return res.status(400).json({
          message: "A group must include at least 3 members (you + 2 others)",
        });
      }
      if (!groupName || !groupName.trim()) {
        return res.status(400).json({ message: "Group name is required" });
      }
    } else {
      if (uniqueParticipants.length !== 2) {
        return res.status(400).json({
          message: "Personal chat requires exactly one other participant",
        });
      }
    }

    const result = await createChatService(
      uniqueParticipants,
      isGroup,
      groupName.trim()
    );
    if (!result) {
      return res.status(400).json({ message: "Failed to create chat" });
    }
    const status = !isGroup && result.existed ? 200 : 201;
    const message =
      !isGroup && result.existed
        ? "Chat already exists"
        : "Chat created successfully";
    res.status(status).json({ message, chat: result.chat });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getChatById = async (req, res) => {
  const { id } = req.params;
  const chat = await getChatByIdService(id);
  if (!chat) {
    return res.status(404).json({ message: "Chat not found" });
  }
  res.json({ message: "Chat fetched successfully", chat });
};
