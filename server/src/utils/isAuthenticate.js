import jwt from "jsonwebtoken";
import { asyncErrorHandler } from "./asyncErrorHandler.js";
import { ApiErrorHandler } from "./ErrorHandler.js";
import { User } from "../models/user.model.js";

export const isAuthenticate = asyncErrorHandler(async (req, _, next) => {
  const token = req.cookies.token;
  if (!token) {
    return next(new ApiErrorHandler(401, "Unauthorized user"));
  }
  try {
    const decodedToken = await jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decodedToken.id);
    if (!user) {
      return next(new ApiErrorHandler(404, "User not found"));
    }
    req.user = user;

    next();
  } catch (error) {
    next(new ApiErrorHandler(401, "something went wrong"));
  }
});
