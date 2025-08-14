import express from "express";
import { registerUser, getUser } from "../controllers/user.controllers.js";
const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.get('/get', getUser);

export default userRouter;
