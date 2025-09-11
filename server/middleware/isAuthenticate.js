import jwt from "jsonwebtoken";
import { ApiErrorHandler } from "../src/utils/ErrorHandler.js";
import { User } from "../src/models/user.model.js";
import { asyncErrorHandler } from "../src/utils/asyncErrorHandler.js";

export const isAuthenticate = asyncErrorHandler(async (req, res, next) => {
  const token =
    req.cookies.token || req.headers.authorization || req.headers.Authorization;
  if (!token) {
    next(new ApiErrorHandler(403, "unAuthorized user"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = await User.findById({ _id: decoded.id });
    next();
  } catch (error) {
    next(new ApiErrorHandler(401, "Invalid request"));
  }
});
