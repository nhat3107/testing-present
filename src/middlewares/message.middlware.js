import openai from "../lib/openai.js";
import cloudinary from "../lib/cloudinary.js";

export const moderateMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message?.content) {
      return res.status(400).json({ message: "Message content is required" });
    }

    let moderation;

    if (message.type === "image") {
      moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: [
          {
            type: "image_url",
            image_url: { url: message.content },
          },
        ],
      });
    } else if (message.type === "text") {
      moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: message.content,
      });
    }

    const result = moderation.results[0];
    const { flagged, categories } = result;

    if (flagged) {
      const violatedCategories = Object.entries(categories)
        .filter(([_, value]) => value === true)
        .map(([key]) =>
          key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        );

      if (message.type === "image") {
        const match = message.content.match(/upload\/v\d+\/(.+)\.[a-z]+$/);
        if (match && match[1]) {
          const publicId = match[1];
          await cloudinary.uploader.destroy(publicId);
        }
      }

      return res.status(400).json({
        message: `Message contains prohibited content in the following categories: ${violatedCategories.join(
          ", "
        )}`,
        details: violatedCategories,
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: "Moderation failed" });
  }
};
