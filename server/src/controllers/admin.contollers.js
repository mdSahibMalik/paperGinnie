import mongoose from "mongoose";
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

// All colleges

const AllRegisteredColleges = asyncErrorHandler(async (_, res, next) => {
  const requests = await College.find({ isVerified: true }).select("-__v");
  return res.status(200).json({
    success: true,
    message: "All Registered Requests sent",
    requests,
  });
});

// const getPendingRequests = asyncErrorHandler(async (_, res, next) => {
//   const requests = await College.find({
//     isVerifiedByAdmin: "pending",
//     isVerified: true,
//   }).select("-__v");
//   return res
//     .status(200)
//     .json({ success: true, message: "pending requests sent", requests });
// });

const verifyUserByAdmin = asyncErrorHandler(async (req, res, next) => {
  try {
    const { status } = req.body;
    const { userId } = req.body;
    const id = new mongoose.Types.ObjectId(userId);
   
    if (!status) {
      return next(new ApiErrorHandler(403, "Status field is required"));
    }

    const updatedUser = await College.findByIdAndUpdate(
      id,
      { isVerifiedByAdmin: status },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return next(new ApiErrorHandler(404, "College not found"));
    }

    res.status(200).json({
      message: "Status verified successfully",
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

const deleteUserByAdmin = asyncErrorHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const {reason} = req.body;
    console.log(reason);

    // 1️⃣ Check if ID is provided
    if (!id) {
      return next(new ApiErrorHandler(400, "User ID is required"));
    }

    // 2️⃣ Validate if ID is a valid ObjectId
    if (!mongoose.isValidObjectId(id)) {
      return next(new ApiErrorHandler(400, "Invalid user ID format"));
    }
    // 3️⃣ Delete the document
    const result = await College.findByIdAndDelete(id);

    // 4️⃣ Check if found
    if (!result) {
      return next(new ApiErrorHandler(404, "User not found"));
    }

    // 5️⃣ Send success response
    res.status(200).json({
      success: true,
      message: "College deleted successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

export {
  adminLogin,
  // getPendingRequests,
  verifyUserByAdmin,
  deleteUserByAdmin,
  AllRegisteredColleges,
};
