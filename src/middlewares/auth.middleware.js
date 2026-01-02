import { verifyToken } from "../utils/verifyToken.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    console.log("Auth error:", err.message);
    res.status(401).json({ message: err.message });
  }
};
