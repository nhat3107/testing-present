import { Router } from "express";
import {
  getMessages,
  sendMessage,
  signUpload,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { moderateMessage } from "../middlewares/message.middlware.js";

const router = Router();

router.get("/:chatId", protectRoute, getMessages);
router.post("/", protectRoute, moderateMessage, sendMessage);
router.post("/sign-upload", protectRoute, signUpload);

export default router;
