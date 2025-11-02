import express from "express";
import {
  registerUser,
  getUser,
  verifyOTP,
  login,
  getAllPaper,
  getPaperByYear,
  getLetestPaper,
} from "../controllers/user.controllers.js";
// import { upload } from "../../middleware/multer.js";
import { isAuthenticate } from "../../middleware/isAuthenticate.js";
import authorizeRoles from "../../middleware/roleMiddleware.js";
import { limiter } from "../../middleware/rateLimit.js";

const userRouter = express.Router();

//! public route for  users
userRouter.post("/register", registerUser);
userRouter.get("/testlimit",limiter, (req, res) =>{
  res.status(200).send('this is rate limit checker');
});
userRouter.post("/verify_otp", verifyOTP);
userRouter.post("/login", login);

//! get user's profile
userRouter.get("/profile",  isAuthenticate,  authorizeRoles("user", "admin"),getUser);

//! protected routes with there role
userRouter.get("/papers",  getAllPaper);
userRouter.get("/papers/:year",  isAuthenticate,  authorizeRoles("user", "college", "admin"),getPaperByYear);
userRouter.get("/letest-papers",  isAuthenticate,  authorizeRoles("user", "college", "admin"),getLetestPaper);


// userRouter.get("/profile",  isAuthenticate,  authorizeRoles("college", "admin"),  (req, res) => {
//     res.send("Welcome College");
//   }
// );
// userRouter.get("/admin",  isAuthenticate,  authorizeRoles("admin"),  (req, res) => {
//     res.send("Welcome Admin");
//   }
// );

export default userRouter;
