import express from "express";
import {
  registerUser,
  getUser,
  verifyOTP,
  login,
  uploadDocument,
} from "../controllers/user.controllers.js";
import { upload } from "../../middleware/multer.js";
import { isAuthenticate } from "../../middleware/isAuthenticate.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/verify_otp", verifyOTP);
userRouter.post("/login", login);
userRouter.post("/protect", isAuthenticate, (req, res) => {
  res.status(200).send('this is protected route');
});
userRouter.post("/upload", upload.single("image"), uploadDocument);
userRouter.get("/get", (req, res) => {
  res.send("hello");
});
userRouter.get("/user",  isAuthenticate,  authorizeRoles("user", "college", "admin"),  (req, res) => {
    res.send("Welcome user");
  }
);
userRouter.get("/college",  isAuthenticate,  authorizeRoles("college", "admin"),  (req, res) => {
    res.send("Welcome College");
  }
);
userRouter.get("/admin",  isAuthenticate,  authorizeRoles("admin"),  (req, res) => {
    res.send("Welcome Admin");
  }
);

export default userRouter;
