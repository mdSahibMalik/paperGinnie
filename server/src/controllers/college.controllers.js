import path from "path";
import fs from "fs/promises";
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
    const { collegeName, email, phone, password, role } = req.body;

    if (!collegeName || !email || !phone || !password || !role) {
      return next(new ApiErrorHandler(400, "All field are required"));
    }
    if (role !== "college") {
      return next(new ApiErrorHandler(400, "choose correct role"));
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

    const createdUser = { collegeName, email, phone, password, role };
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
      newUser: {
        _id: newUser._id,
        name: newUser.collegeName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
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
    const { email, emailOTP, mobileOTP } = req.body;
    if (!email || !emailOTP || !mobileOTP) {
      return next(new ApiErrorHandler(400, "All fields are required"));
    }

    const newUser = await College.findOne({ email, isVerified: false })
      .sort({ createdAt: -1 })
      .select(
        "-password +emailVerificationCode +emailVerificationCodeExpire +mobileVerificationCode +mobileVerificationCodeExpire"
      );
    if (!newUser) {
      return next(new ApiErrorHandler(404, "User not found"));
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
      isVerifiedByAdmin: true,
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
    "-password -createdAt -updatedAt -__v -_id -verificationCode -verificationCodeExpire -isVerified -isVerifiedByAdmin -emailVerificationCode -emailVerificationCodeExpire -mobileVerificationCode -mobileVerificationCodeExpire"
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
    const { paperName, year, description, department, course } = req.body;
    const paperFile = req.file;
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

    if (!paperName || !year || !description || !department || !course) {
      return next(new ApiErrorHandler(401, "Every field must be needed. "));
    }
    const parseYear = parseInt(year);
    const currentYear = new Date().getFullYear();
    if (parseYear > currentYear || parseYear < 2010) {
      return next(new ApiErrorHandler(401, "year should be correct"));
    }
    const getUser = req.user;
    const user = await College.findById(getUser.id);
    const collegeName = user.collegeName;

    const fileExist = await PaperDocument.findOne({
      paperName,
      year,
      course,
      collegeName,
    });
    if (fileExist) {
      return next(new ApiErrorHandler(403, "file already uploaed "));
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
      fileUrl: cloudinaryFile.url,
      collegeName,
    });

    await paper.save();
    const temp = {
      paperName: paper.paperName,
      year: 2020,
      description: "this is mca exam paper",
      department: "qwwr",
      course: "CS&IT",
      fileUrl: paper.fileUrl,
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

export { registerCollege, verifyOTP, login, createDocument, getCollgeProfile };
