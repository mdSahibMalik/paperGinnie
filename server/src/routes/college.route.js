import express from "express";
import {
  createDocument,
  deleteFromCloudinary,
  deletePaperById,
  forgetPassword,
  getCollgeProfile,
  getPaperOfCollege,
  getPaperOfCollegeById,
  login,
  registerCollege,
  resetPassword,
  updatePaperById,
  verifyOTP,
} from "../controllers/college.controllers.js";
import { isAuthenticate } from "../../middleware/isAuthenticate.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { upload } from "../../middleware/multer.js";

const collegeRouter = express.Router();

//! public route for colleges
collegeRouter.post("/register", registerCollege);
collegeRouter.post("/verify-otp", verifyOTP);
collegeRouter.post("/login", login);
collegeRouter.post("/forget-password", forgetPassword);
collegeRouter.post("/reset-password/:token", resetPassword);

//! protected route for colleges
collegeRouter.post(
  "/create-document",
  isAuthenticate,
  authorizeRoles("college", "admin"),
  upload.single("file"),
  createDocument
);
collegeRouter.get(
  "/profile",
  isAuthenticate,
  authorizeRoles("college", "admin"),
  getCollgeProfile
);
collegeRouter.get(
  "/getPaper",
  isAuthenticate,
  authorizeRoles("college", "admin"),
  getPaperOfCollege
);
collegeRouter.get(
  "/getPaper/:id",
  isAuthenticate,
  authorizeRoles("college", "admin"),
  getPaperOfCollegeById
);


collegeRouter.put(
  "/updatePaper/:id",
  isAuthenticate,
  authorizeRoles("college", "admin"),
  upload.single("file"),
  updatePaperById
);

// delete file from cloudinary 
collegeRouter.delete(
  "/deletefile/:id",
  isAuthenticate,
  authorizeRoles("college", "admin"),
  deleteFromCloudinary
);

// delete file from cloudinary and database
collegeRouter.delete(
  "/deletePaper/:id",
  isAuthenticate,
  authorizeRoles("college", "admin"),
  deletePaperById
);

export default collegeRouter;
