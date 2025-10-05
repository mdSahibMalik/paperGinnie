import { College } from "../models/college.model.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiErrorHandler } from "../utils/ErrorHandler.js";
import { Admin } from "../models/admin.model.js";
import { sendToken } from "../utils/sendToken.js";

//! admin login

const adminLogin = asyncErrorHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ApiErrorHandler(403, "login credientials required"));
  }
  const userExist = await Admin.findOne({ email }).select("+password");
  if (!userExist) {
    return next(new ApiErrorHandler(403, "User not found"));
  }
  const passwordMatched = await userExist.comparePassword(password);
  if (!passwordMatched) {
    return next(new ApiErrorHandler(401, "Invalid pass credientials"));
  }
  sendToken(userExist, res);
});

const getPendingRequests = asyncErrorHandler(async (_, res, next) => {
  const requests = await College.find({
    isVerifiedByAdmin: "pending",
    isVerified: true,
  });
  return res
    .status(200)
    .json({ success: true, message: "pending requests sent", requests });
});

const verifyUserByAdmin = asyncErrorHandler(async (req, res, next) => {
  const { status, userEmail } = req.body;
  if (!status || !userEmail) {
    return next(new ApiErrorHandler(403, "All field are required"));
  }

  const existUser = await College.findOne({ email: userEmail });
  if (!existUser) {
    return next(new ApiErrorHandler(404, "User not found"));
  }

  // Validate status value
  if (status !== "verified" && status !== "rejected") {
    return next(
      new ApiErrorHandler(403, "Status must be either 'verified' or 'rejected'")
    );
  }

  existUser.isVerifiedByAdmin = status;
  await existUser.save({ validateModifiedOnly: true });

  res.status(200).json({
    message: "Status verified successfully",
    success: true,
  });
});

const deleteUserByAdmin = asyncErrorHandler(async (req, res, next) => {
  const { userEmail } = req.body;
  if (!userEmail) {
    return next(new ApiErrorHandler(403, "User Email are required"));
  }
  const result = await College.findOneAndDelete({ email: userEmail });

  if (!result || result.deletedCount === 0) {
    return next(new ApiErrorHandler(404, "User not found"));
  }
  res.status(200).json({
    success: true,
    message: "User deleted successfully"
});
});

export { adminLogin, getPendingRequests, verifyUserByAdmin, deleteUserByAdmin };
