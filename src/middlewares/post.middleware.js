import openai from "../lib/openai.js";
import cloudinary from "../lib/cloudinary.js";

/**
 * Moderate post content before creation
 * Checks both text content and media URLs
 */
export const moderatePost = async (req, res, next) => {
  try {
    const { content, media = [] } = req.body;

    // If no content and no media, skip moderation (validation will happen in controller)
    if (!content && (!media || media.length === 0)) {
      return next();
    }

    let moderationResults = [];

    // Moderate text content if exists
    if (content && content.trim()) {
      const textModeration = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: content,
      });
      moderationResults.push({
        type: "text",
        result: textModeration.results[0],
      });
    }

    // Moderate media URLs if exist
    if (media && media.length > 0) {
      for (const mediaItem of media) {
        const mediaUrl = mediaItem.url;
        const mediaModeration = await openai.moderations.create({
          model: "omni-moderation-latest",
          input: [
            {
              type: "image_url",
              image_url: { url: mediaUrl },
            },
          ],
        });
        moderationResults.push({
          type: mediaItem.type || "image",
          url: mediaUrl,
          result: mediaModeration.results[0],
        });
      }
    }

    // Check if any content is flagged
    const flaggedContent = moderationResults.filter((mod) => mod.result.flagged);

    if (flaggedContent.length > 0) {
      // Delete flagged images from Cloudinary
      for (const flagged of flaggedContent) {
        if (flagged.type === "image" && flagged.url) {
          const match = flagged.url.match(/upload\/v\d+\/(.+)\.[a-z]+$/);
          if (match && match[1]) {
            const publicId = match[1];
            await cloudinary.uploader.destroy(publicId);
          }
        }
      }

      // Collect all violated categories
      const allViolations = new Set();
      flaggedContent.forEach((flagged) => {
        const { categories } = flagged.result;
        Object.entries(categories)
          .filter(([_, value]) => value === true)
          .forEach(([key]) => {
            const formatted = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());
            allViolations.add(formatted);
          });
      });

      return res.status(400).json({
        message: `Post contains prohibited content in the following categories: ${Array.from(
          allViolations
        ).join(", ")}`,
        details: Array.from(allViolations),
        flaggedTypes: flaggedContent.map((f) => f.type),
      });
    }

    // If everything passes, continue to controller
    next();
  } catch (error) {
    console.error("Post moderation error:", error);
    // If moderation fails, we can choose to allow the post or reject it
    // For safety, let's reject it
    return res.status(500).json({
      message: "Content moderation failed. Please try again.",
    });
  }
};

/**
 * Moderate comment content before creation
 */
export const moderateComment = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return next();
    }

    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: content,
    });

    const result = moderation.results[0];
    const { flagged, categories } = result;

    if (flagged) {
      const violatedCategories = Object.entries(categories)
        .filter(([_, value]) => value === true)
        .map(([key]) =>
          key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        );

      return res.status(400).json({
        message: `Comment contains prohibited content in the following categories: ${violatedCategories.join(
          ", "
        )}`,
        details: violatedCategories,
      });
    }

    next();
  } catch (error) {
    console.error("Comment moderation error:", error);
    return res.status(500).json({
      message: "Content moderation failed. Please try again.",
    });
  }
};







