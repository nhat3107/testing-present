import { Router } from "express";
import {
  getChats,
  createChat,
  getChatById,
} from "../controllers/chat.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";


const router = Router();

router.get("/", protectRoute, getChats);
router.post("/", protectRoute, createChat);
router.get("/:id", protectRoute, getChatById);


export default router;
