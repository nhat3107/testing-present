import { Router } from "express";
import {
  createPost,
  getFeedPosts,
  getAllPosts,
  getPostById,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  getUserPosts,
} from "../controllers/post.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
import { moderatePost, moderateComment } from "../middlewares/post.middleware.js";

const router = Router();

// Post CRUD routes
router.post("/create-post", protectRoute, moderatePost, createPost);
router.get("/get-feed", protectRoute, getFeedPosts);
router.get("/get-all", protectRoute, getAllPosts);
router.get("/get-post/:id", protectRoute, getPostById);
router.delete("/delete-post/:id", protectRoute, deletePost);
router.get("/get-user-posts/:userId", protectRoute, getUserPosts);

// Post interaction routes
router.post("/toggle-like/:id", protectRoute, toggleLike);

// Comment routes
router.post("/add-comment/:id", protectRoute, moderateComment, addComment);
router.get("/get-comments/:id", protectRoute, getComments);
router.delete("/delete-comment/:id", protectRoute, deleteComment);

export default router;