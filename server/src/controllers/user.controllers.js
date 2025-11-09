import { PaperDocument } from "../models/document.model.js";
import { Subscribe } from "../models/subscribe.js";
import { User } from "../models/user.model.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiErrorHandler } from "../utils/ErrorHandler.js";
import { sendMail } from "../utils/sendMail.js";
import { sendToken } from "../utils/sendToken.js";
import uploadOnCloudinary from "../utils/uploadOnCloudinary.js";

const registerUser = asyncErrorHandler(async (req, res, next) => {
  try {
    // console.log("here is register route");
    // res.status(200).send("this is register route");

    const { fullName, email, phone, password } = req.body;

    if (!fullName || !email || !phone || !password) {
      return next(new ApiErrorHandler(400, "All field are required"));
    }

    const userExist = await User.findOne({ email });
    if (userExist) {
      return next(new ApiErrorHandler(403, "User already registered"));
    }

    const userAttemt = await User.find({
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
      fullName,
      email,
      phone,
      password,
      registerToken: token,
      registerTokenExpire: tokenExpiry,
    };
    const user = await User.create(createdUser);
    const verificationCode = user.generateVerificationCode();
    await user.save({ validateBeforeSave: true });
    await sendVerificationCode(verificationCode, email);
    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
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

//! get user

const getUser = async (req, res) => {
  const tempUser = req.user;
  const user = await User.findOne(tempUser.id).select(
    "-password -createdAt -updatedAt -__v -_id -verificationCode -verificationCodeExpire -isVerified"
  );
  console.log(user);
  return res.status(200).json({
    success: true,
    user,
    message: "user found successfully",
  });
};

const verifyOTP = asyncErrorHandler(async (req, res, next) => {
  try {
    const { token, otp } = req.body;
    if (!token || !otp) {
      return next(new ApiErrorHandler(400, "All fields are required"));
    }

    const user = await User.findOne({ registerToken: token, isVerified: false })
      .sort({ createdAt: -1 })
      .select("-password");
    if (!user) {
      return next(new ApiErrorHandler(404, "User not found"));
    }

    if (Date.now() > user.registerTokenExpire) {
      return res.status(400).json({ success: false, message: "Token expired" });
    }

    // check otp is valid or not

    if (user.verificationCode !== Number(otp)) {
      return next(new ApiErrorHandler(403, "Enter valid otp"));
    }

    const currentDate = Date.now();
    const codeExpiryDate = new Date(user.verificationCodeExpire).getTime();

    // check otp is valid or expire
    if (currentDate > codeExpiryDate) {
      return next(new ApiErrorHandler(401, "Your OTP has expired.."));
    }
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpire = null;
    user.registerToken = null;
    user.registerTokenExpire = null;

    await user.save({ validateModifiedOnly: true });
    return res.status(200).json({
      success: true,
      message: "OTP varify successfully",
    });
  } catch (error) {
    next(new ApiErrorHandler(403, error));
  }
});

const login = asyncErrorHandler(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiErrorHandler(401, "All fields are required"));
    }
    const userExist = await User.findOne({ email, isVerified: true }).select(
      "+password"
    );
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

//* get letest paper
const getLetestPaper = asyncErrorHandler(async (_, res, next) => {
  const paper = await PaperDocument.find({
    year: { $in: [2024, 2025] },
  }).select("-createdAt -updatedAt -__v -_id");
  console.log(paper);
  return res.status(200).json({
    success: true,
    paper,
    message: "paper sent",
  });
});

//* get all paper without any filter
const getAllPaper = asyncErrorHandler(async (_, res, next) => {
  const paper = await PaperDocument.find().select(
    "-createdAt -updatedAt -__v -_id"
  );
  return res.status(200).json({
    success: true,
    paper,
    message: "paper sent",
  });
});

//* get paper using a specific year
const getPaperByYear = asyncErrorHandler(async (req, res, next) => {
  const year = req.params.year;
  const paper = await PaperDocument.find({ year }).select(
    "-createdAt -updatedAt -__v -_id"
  );
  console.log(paper);
  return res.status(200).json({
    success: true,
    paper,
    message: "paper sent",
  });
});
const subscribe = asyncErrorHandler(async (req, res, next) => {
  const email = req.body.email;
  if (!email) {
    res.status(401).json({success:false, message:"Email is required" })
  }
  const existEmail = await Subscribe.find({email});
  if(existEmail){
    return next(new ApiErrorHandler(403, 'email already registered'));
  }
  await Subscribe.insertOne({email});
  return res.status(200).json({
    success: true,
    message: "Thanks for subscribing.",
  });
});



export {
  registerUser,
  verifyOTP,
  login,
  getUser,
  getLetestPaper,
  getAllPaper,
  getPaperByYear,
  subscribe
};

//     paperName: 'COMPUTER FUNDAMENTAL', okk
//     year: 2025,
//     description: 'this is mca exam paper',
//     department: 'CS&IT',
//     course: 'MCA',
//     fileUrl: 'http://res.cloudinary.com/dx1n4sl3c/image/upload/v1759259330/l1nf1zpf7yesnmckjpgw.jpg',
//     collegeName: 'motherhood'
