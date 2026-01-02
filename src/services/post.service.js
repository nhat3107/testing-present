import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";

/**
 * Create a new post
 */
export const createPostService = async (authorId, content, media = []) => {
  const post = new Post({
    authorId,
    content,
    media,
  });
  const savedPost = await post.save();
  return await Post.findById(savedPost._id).populate(
    "authorId",
    "username avatarUrl fullName"
  );
};

/**
 * Get feed posts for a user (posts from users they follow + their own posts)
 */
export const getFeedPostsService = async (userId, page = 1, limit = 10) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Get posts from users they follow + their own posts
  const followingIds = user.following || [];
  const userIds = [userId, ...followingIds];

  const skip = (page - 1) * limit;

  const posts = await Post.find({ authorId: { $in: userIds } })
    .populate("authorId", "username avatarUrl")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments({ authorId: { $in: userIds } });
  const hasMore = skip + posts.length < totalPosts;

  return { posts, hasMore, total: totalPosts };
};

/**
 * Get all posts (public feed)
 */
export const getAllPostsService = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const posts = await Post.find()
    .populate("authorId", "username avatarUrl")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments();
  const hasMore = skip + posts.length < totalPosts;

  return { posts, hasMore, total: totalPosts };
};

/**
 * Get a single post by ID
 */
export const getPostByIdService = async (postId) => {
  return await Post.findById(postId).populate(
    "authorId",
    "username avatarUrl"
  );
};

/**
 * Delete a post
 */
export const deletePostService = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");

  // Check if user is the author
  if (post.authorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized to delete this post");
  }

  // Delete all comments associated with this post
  await Comment.deleteMany({ postId });

  // Delete the post
  await Post.findByIdAndDelete(postId);
  return true;
};

/**
 * Toggle like on a post
 */
export const toggleLikeService = async (postId, userId) => {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");

  const userIdStr = userId.toString();
  const likeIndex = post.likes.findIndex(
    (id) => id.toString() === userIdStr
  );

  let liked;
  if (likeIndex > -1) {
    // Unlike: remove user from likes array
    post.likes.splice(likeIndex, 1);
    liked = false;
  } else {
    // Like: add user to likes array
    post.likes.push(userId);
    liked = true;
  }

  await post.save();

  return {
    liked,
    likesCount: post.likes.length,
    post: await Post.findById(postId).populate("authorId", "username avatarUrl"),
  };
};

/**
 * Add a comment to a post
 */
export const addCommentService = async (postId, authorId, content) => {
  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found");

  const comment = new Comment({
    postId,
    authorId,
    content,
  });

  const savedComment = await comment.save();

  // Increment comments count
  post.commentsCount += 1;
  await post.save();

  return await Comment.findById(savedComment._id).populate(
    "authorId",
    "username avatarUrl"
  );
};

/**
 * Get comments for a post
 */
export const getCommentsService = async (postId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  const comments = await Comment.find({ postId })
    .populate("authorId", "username avatarUrl")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalComments = await Comment.countDocuments({ postId });
  const hasMore = skip + comments.length < totalComments;

  return { comments, hasMore, total: totalComments };
};

/**
 * Delete a comment
 */
export const deleteCommentService = async (commentId, userId) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new Error("Comment not found");

  // Check if user is the author
  if (comment.authorId.toString() !== userId.toString()) {
    throw new Error("Unauthorized to delete this comment");
  }

  // Decrement comments count in post
  await Post.findByIdAndUpdate(comment.postId, {
    $inc: { commentsCount: -1 },
  });

  await Comment.findByIdAndDelete(commentId);
  return true;
};

/**
 * Get user's own posts
 */
export const getUserPostsService = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const posts = await Post.find({ authorId: userId })
    .populate("authorId", "username avatarUrl")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPosts = await Post.countDocuments({ authorId: userId });
  const hasMore = skip + posts.length < totalPosts;

  return { posts, hasMore, total: totalPosts };
};


