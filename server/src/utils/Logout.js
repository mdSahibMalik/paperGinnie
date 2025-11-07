import { asyncErrorHandler } from "./asyncErrorHandler.js";


export const logout = asyncErrorHandler(async (req, res, next) => {
  res.cookie("token", {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});