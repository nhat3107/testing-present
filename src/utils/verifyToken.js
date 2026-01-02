import jwt from "jsonwebtoken";
import { getUserById } from "../services/user.service.js";

export const verifyToken = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  if (!decoded) throw new Error("Invalid token");
  const user = await getUserById(decoded.userId);

  if (!user) throw new Error("User not found");
  return user;
};
