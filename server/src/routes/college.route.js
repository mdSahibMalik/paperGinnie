import express from 'express';
import { createDocument, getCollgeProfile, login, registerCollege, verifyOTP } from '../controllers/college.controllers.js';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import authorizeRoles from '../../middleware/roleMiddleware.js';
import { upload } from '../../middleware/multer.js';

const collegeRouter = express.Router();

//! public route for colleges
collegeRouter.post('/register', registerCollege);
collegeRouter.post('/verify-otp', verifyOTP);
collegeRouter.post('/login', login);

//! protected route for colleges
collegeRouter.post("/create-document",  isAuthenticate,  authorizeRoles("college", "admin"),upload.single('file'),  createDocument);
collegeRouter.get("/profile",  isAuthenticate,  authorizeRoles("college", "admin"), getCollgeProfile);


export default collegeRouter;