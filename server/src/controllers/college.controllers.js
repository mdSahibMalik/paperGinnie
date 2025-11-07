import path from "path";
import fs from "fs/promises";
import { v2 as cloudinary, v2 } from "cloudinary";
import { ObjectId } from "mongodb";
import { College } from "../models/college.model.js";
import { PaperDocument } from "../models/document.model.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiErrorHandler } from "../utils/ErrorHandler.js";
import { sendMail } from "../utils/sendMail.js";
import { sendMobileSmsByTwilio } from "../utils/sendSmsByTwillio.js";
import { sendToken } from "../utils/sendToken.js";
import uploadOnCloudinary from "../utils/uploadOnCloudinary.js";

const registerCollege = asyncErrorHandler(async (req, res, next) => {
  try {
    const { collegeName, email, phone, password } = req.body;

    if (!collegeName || !email || !phone || !password) {
      return next(new ApiErrorHandler(400, "All field are required"));
    }

    const userExist = await College.findOne({ email });
    if (userExist) {
      return next(new ApiErrorHandler(403, "User already registered"));
    }

    const userAttemt = await College.find({
      email,
      isVerified: false,
      phone,
    });
    if (userAttemt.length > 3) {
      return next(
        new ApiErrorHandler(
          403,
          "Registered attempt reached ! try again after some times"
        )
      );
    }
    const token = crypto.randomUUID();
    const tokenExpiry = Date.now() + 10 * 60 * 1000;
    const createdUser = {
      collegeName,
      email,
      phone,
      password,
      registerToken: token,
      registerTokenExpire: tokenExpiry,
    };
    const newUser = await College.create(createdUser);

    const verificationCode = newUser.generateVerificationCode();
    const verificationCodeforMobile =
      newUser.generateVerificationCodeForMobile();

    newUser.save({ validateBeforeSave: true });
    await sendVerificationCode(verificationCode, email);
    //* send OTP  via sms
    await sendMobileSmsByTwilio(phone, verificationCodeforMobile);
    return res.status(201).json({
      success: true,
      message: "newUser created successfully",
      user: {
        _id: newUser._id,
        name: newUser.collegeName,
        email: newUser.email,
        phone: newUser.phone,
        token: token,
      },
    });
  } catch (error) {
    console.log(error);
    next(new ApiErrorHandler(403, error));
  }
});

const sendVerificationCode = async (verificationCode, email) => {
  const message = generateEmailTemplate(verificationCode);
  await sendMail({ message, email, subject: "for verification email" });
};

function generateEmailTemplate(verificationCode) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Email Verification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f7f9fb;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 480px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
      padding: 30px;
    }
    h2 {
      color: #2c3e50;
    }
    .code-box {
      background-color: #f1f3f5;
      padding: 15px;
      font-size: 24px;
      font-weight: bold;
      letter-spacing: 4px;
      text-align: center;
      border-radius: 6px;
      margin: 20px 0;
      color: #2c3e50;
    }
    .footer {
      font-size: 12px;
      color: #888;
      text-align: center;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Verify Your Email</h2>
    <p>Hi  "there",</p>
    <p>Use the following code to verify your email address:</p>

    <div class="code-box">\`${verificationCode}\`</div>

    <p>This code will expire in 10 minutes. If you didn’t request this, please ignore this email.</p>

    <p>Thanks,<br>The Team</p>

    <div class="footer">
      &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
}

const verifyOTP = asyncErrorHandler(async (req, res, next) => {
  try {
    const { token, emailOTP, mobileOTP } = req.body;
    if (!token || !emailOTP || !mobileOTP) {
      return next(new ApiErrorHandler(400, "All fields are required"));
    }

    const newUser = await College.findOne({
      registerToken: token,
      isVerified: false,
    })
      .sort({ createdAt: -1 })
      .select(
        "-password +registerTokenExpire +emailVerificationCode +emailVerificationCodeExpire +mobileVerificationCode +mobileVerificationCodeExpire"
      );
    if (!newUser) {
      return next(new ApiErrorHandler(404, "User not found"));
    }

    if (Date.now() > newUser.registerTokenExpire) {
      return res.status(400).json({ success: false, message: "Token expired" });
    }
    // check oto is valid or not

    if (newUser.emailVerificationCode !== Number(emailOTP)) {
      return next(new ApiErrorHandler(403, "Enter valid email OTP"));
    }
    if (newUser.mobileVerificationCode !== Number(mobileOTP)) {
      return next(new ApiErrorHandler(403, "Enter valid mobile OTP"));
    }

    const currentDate = Date.now();
    const emailCodeExpiryDate = new Date(
      newUser.emailVerificationCodeExpire
    ).getTime();
    const mobileCodeExpiryDate = new Date(
      newUser.mobileVerificationCodeExpire
    ).getTime();

    // check email otp is valid or expire
    if (currentDate > emailCodeExpiryDate) {
      return next(new ApiErrorHandler(401, "Your Email OTP expired.."));
    }
    // check mobile otp is valid or expire
    if (currentDate > mobileCodeExpiryDate) {
      return next(new ApiErrorHandler(401, "Your mobile OTP expired.."));
    }
    newUser.isVerified = true;
    newUser.emailVerificationCode = null;
    newUser.emailVerificationCodeExpire = null;
    newUser.mobileVerificationCode = null;
    newUser.mobileVerificationCodeExpire = null;
    newUser.registerToken = null;
    newUser.registerTokenExpire = null;
    newUser.save({ validateModifiedOnly: true });
    return res.status(200).json({
      success: true,
      message: "OTP varify successfully",
    });
  } catch (error) {
    next(new ApiErrorHandler(403, error));
  }
});

//! login college via email and password...

const login = asyncErrorHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiErrorHandler(401, "All fields are required"));
    }
    const userExist = await College.findOne({
      email,
      isVerified: true,
      isVerifiedByAdmin: "verified",
    }).select("+password");
    if (!userExist) {
      return next(new ApiErrorHandler(404, "User not found"));
    }

    const comparePassword = await userExist.comparePassword(password);
    if (!comparePassword) {
      return next(new ApiErrorHandler(403, "Invalid credientials"));
    }
    sendToken(userExist, res);
  } catch (error) {
    next(new ApiErrorHandler(403, "somethin went wrong at the login time"));
  }
});

//! get college profile

const getCollgeProfile = async (req, res) => {
  const tempUser = req.user;
  const user = await College.findOne(tempUser.id).select(
    "-password  -updatedAt -__v  -verificationCode -verificationCodeExpire  -isVerifiedByAdmin -emailVerificationCode -emailVerificationCodeExpire -mobileVerificationCode -mobileVerificationCodeExpire"
  );
  return res.status(200).json({
    success: true,
    user,
    message: "user found successfully",
  });
};

//! Here is college create document
const createDocument = asyncErrorHandler(async (req, res, next) => {
  const allowedExtensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"];
  try {
    const {
      paperName,
      year,
      description,
      department,
      course,
      semester,
      collegeName,
    } = req.body;
    const paperFile = req.file;
    //  return res.status(200).json({ success: true, message: "file received" });
    if (!paperFile) {
      return next(new ApiErrorHandler(403, "file should be exist"));
    }

    //* check file extension
    const fileExt = path.extname(paperFile.path).toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      console.warn(`File type ${fileExt} is not allowed.`);
      await fs.unlink(paperFile.path); // Delete invalid file
      return next(
        new ApiErrorHandler(
          403,
          `File type ${fileExt} is not allowed. Only PDF and JPG/JPEG are accepted.`
        )
      );
    }

    if (!paperName || !year || !department || !course || !semester) {
      return next(new ApiErrorHandler(401, "Every field must be needed. "));
    }
    if (semester > 12) {
      return next(new ApiErrorHandler(401, "Select valid semester"));
    }
    const parseYear = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (parseYear > currentYear || parseYear < 2010) {
      return next(new ApiErrorHandler(401, "year should be correct"));
    }

    let clgName;
    if (collegeName.length > 0) {
      clgName = collegeName;
    } else {
      const getUser = req.user;
      const user = await College.findById(getUser.id);
      clgName = user.collegeName;
    }

    const fileExist = await PaperDocument.findOne({
      paperName,
      year,
      course,
      collegeName: clgName,
      semester,
    });
    if (fileExist) {
      return next(new ApiErrorHandler(403, "file already uploaded"));
    }

    //* upload on cloudinary
    const cloudinaryFile = await uploadOnCloudinary(paperFile.path);
    if (!cloudinaryFile) {
      return next(new ApiErrorHandler(403, "something went wrong"));
    }

    const paper = new PaperDocument({
      paperName,
      year,
      description,
      department,
      course,
      semester,
      fileUrl: cloudinaryFile.url,
      collegeName: clgName,
      publicId: cloudinaryFile.public_id,
    });

    await paper.save();
    const temp = {
      paperName: paper.paperName,
      year: paper.year,
      description: paper.description,
      department: paper.department,
      course: paper.course,
      fileUrl: paper.fileUrl,
      collegeName: paper.collegeName,
      semester,
    };

    return res.status(200).json({
      success: true,
      message: "paper Upload successfully",
      paper: temp,
    });
  } catch (error) {
    console.log(error);
    next(new ApiErrorHandler(403, "something went wrong", error));
  }
});

const getPaperOfCollege = asyncErrorHandler(async (req, res, next) => {
  try {
    const getUser = req.user;

    if (getUser.role === "admin") {
      const user = await PaperDocument.find();
      return res
        .status(200)
        .json({ success: true, message: "user found", user });
    } else {
      const getuser = await College.findById(getUser.id);
      // return res.status(200).json({ success: true, message: "user found" });

      const user = await PaperDocument.find({
        collegeName: getuser.collegeName,
      });
      return res
        .status(200)
        .json({ success: true, message: "user found", user });
    }
  } catch (error) {
    next(new ApiErrorHandler(403, "something went wrong", error));
  }
});

const getPaperOfCollegeById = asyncErrorHandler(async (req, res, next) => {
  try {
    const id = new ObjectId(req.params.id); // Convert to ObjectId
    const paper = await PaperDocument.findById(id); // ✅ CORRECT USAGE

    if (!paper) {
      return next(new ApiErrorHandler(404, "Paper not found"));
    }

    return res.status(200).json({
      success: true,
      message: "Paper found",
      paper,
    });
  } catch (error) {
    console.error(error);
    next(new ApiErrorHandler(403, "Something went wrong", error));
  }
});

const updatePaperById = asyncErrorHandler(async (req, res, next) => {
  try {
    const id = new ObjectId(req.params.id); // Convert to ObjectId
    const { paperName, year, description, department, course } = req.body;
    const paperFile = req.file;

    let cloudinaryFile;
    if (paperFile) {
      const allowedExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".jpg",
        ".jpeg",
        ".png",
      ];
      //* check file extension
      const fileExt = path.extname(paperFile.path).toLowerCase();
      if (!allowedExtensions.includes(fileExt)) {
        console.warn(`File type ${fileExt} is not allowed.`);
        await fs.unlink(paperFile.path); // Delete invalid file
        return next(
          new ApiErrorHandler(
            403,
            `File type ${fileExt} is not allowed. Only PDF and JPG/JPEG are accepted.`
          )
        );
      }
      if (paperFile) {
        //* upload on cloudinary
        cloudinaryFile = await uploadOnCloudinary(paperFile.path);
        if (!cloudinaryFile) {
          return next(
            new ApiErrorHandler(403, "something went wrong with file upload")
          );
        }
      }
    }

    const updatedData = {
      paperName,
      year,
      description,
      fileUrl: cloudinaryFile ? cloudinaryFile.url : undefined,
      publicId: cloudinaryFile ? cloudinaryFile.public_id : undefined,
      department,
      course,
    };

    const paper = await PaperDocument.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!paper) {
      return next(new ApiErrorHandler(404, "Paper not found"));
    }

    return res.status(200).json({
      success: true,
      message: "Paper updated successfully",
      paper,
    });
  } catch (error) {
    console.error(error);
    next(new ApiErrorHandler(403, "Something went wrong", error));
  }
});

//! delete Cloudinary file function
const deleteFromCloudinary = asyncErrorHandler(async (req, res, next) => {
  try {
    const id = new ObjectId(req.params.id); // Convert to ObjectId
    if (!id) {
      return next(new ApiErrorHandler(404, "Paper id is required"));
    }
    const paper = await PaperDocument.findById(id).select("+publicId");
    if (!paper) {
      return next(new ApiErrorHandler(404, "Paper not found"));
    }
    const result = await cloudinary.uploader.destroy(paper.publicId);

    console.log("Cloudinary deletion result:", result);
    paper.publicId = null;
    paper.fileUrl = null;
    await paper.save({ validateModifiedOnly: true });
    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
      result,
    });
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    throw error;
  }
});

const deletePaperById = asyncErrorHandler(async (req, res, next) => {
  try {
    const id = new ObjectId(req.params.id); // Convert to ObjectId
    if (!id) {
      return next(new ApiErrorHandler(404, "Paper id is required"));
    }
    const paper = await PaperDocument.findById(id).select("+publicId");
    if (!paper) {
      return next(new ApiErrorHandler(404, "Paper not found"));
    }
    if (paper.publicId) {
      await cloudinary.uploader.destroy(paper.publicId);
    }

    await PaperDocument.findByIdAndDelete({ _id: paper._id });
    return res.status(200).json({
      success: true,
      message: "Paper deleted successfully",
    });
  } catch (error) {
    next(ApiErrorHandler(403, "something went wrong"));
  }
});

export {
  registerCollege,
  verifyOTP,
  login,
  createDocument,
  getCollgeProfile,
  getPaperOfCollege,
  getPaperOfCollegeById,
  updatePaperById,
  deleteFromCloudinary,
  deletePaperById,
};
