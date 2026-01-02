import {
  createPostService,
  getFeedPostsService,
  getAllPostsService,
  getPostByIdService,
  deletePostService,
  toggleLikeService,
  addCommentService,
  getCommentsService,
  deleteCommentService,
  getUserPostsService,
} from "../services/post.service.js";

/**
 * Create a new post
 * POST /api/post/create-post
 */
export const createPost = async (req, res) => {
  try {
    const { content, media = [] } = req.body;
    const userId = req.user._id;

    if (!content && (!media || media.length === 0)) {
      return res.status(400).json({
        message: "Post must contain either content or media",
      });
    }

    const post = await createPostService(userId, content, media);

    res.status(201).json({
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Error in createPost controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get feed posts (from followed users + own posts)
 * GET /api/post/get-feed
 */
export const getFeedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getFeedPostsService(userId, page, limit);

    res.status(200).json({
      message: "Feed fetched successfully",
      posts: result.posts,
      hasMore: result.hasMore,
      total: result.total,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in getFeedPosts controller:", error);
    res.status(500).json({ message: error.message || "Internal Server Error" });
  }
};

/**
 * Get all posts (public feed)
 * GET /api/post/get-all
 */
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getAllPostsService(page, limit);

    res.status(200).json({
      message: "Posts fetched successfully",
      posts: result.posts,
      hasMore: result.hasMore,
      total: result.total,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in getAllPosts controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get a single post by ID
 * GET /api/post/get-post/:id
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await getPostByIdService(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({
      message: "Post fetched successfully",
      post,
    });
  } catch (error) {
    console.error("Error in getPostById controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Delete a post
 * DELETE /api/post/delete-post/:id
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    await deletePostService(id, userId);

    res.status(200).json({
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error in deletePost controller:", error);
    if (error.message === "Post not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Unauthorized to delete this post") {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Toggle like on a post
 * POST /api/post/toggle-like/:id
 */
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await toggleLikeService(id, userId);

    res.status(200).json({
      message: result.liked ? "Post liked" : "Post unliked",
      liked: result.liked,
      likesCount: result.likesCount,
      post: result.post,
    });
  } catch (error) {
    console.error("Error in toggleLike controller:", error);
    if (error.message === "Post not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Add a comment to a post
 * POST /api/post/add-comment/:id
 */
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment content is required",
      });
    }

    const comment = await addCommentService(id, userId, content.trim());

    res.status(201).json({
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("Error in addComment controller:", error);
    if (error.message === "Post not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get comments for a post
 * GET /api/post/get-comments/:id
 */
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await getCommentsService(id, page, limit);

    res.status(200).json({
      message: "Comments fetched successfully",
      comments: result.comments,
      hasMore: result.hasMore,
      total: result.total,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in getComments controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Delete a comment
 * DELETE /api/post/delete-comment/:id
 */
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    await deleteCommentService(id, userId);

    res.status(200).json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteComment controller:", error);
    if (error.message === "Comment not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "Unauthorized to delete this comment") {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Get user's own posts
 * GET /api/post/get-user-posts/:userId
 */
export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await getUserPostsService(userId, page, limit);

    res.status(200).json({
      message: "User posts fetched successfully",
      posts: result.posts,
      hasMore: result.hasMore,
      total: result.total,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error in getUserPosts controller:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};