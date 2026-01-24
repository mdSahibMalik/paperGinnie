import { PaperDocument } from "../models/document.model.js";
import { Subscribe } from "../models/subscribe.js";
import { User } from "../models/user.model.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiErrorHandler } from "../utils/ErrorHandler.js";
import { sendMail } from "../utils/sendMail.js";
import { sendToken } from "../utils/sendToken.js";
import axios from "axios";
import crypto from "crypto";

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

//* reset & forget password

const forgetPassword = asyncErrorHandler(async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new ApiErrorHandler(400, "Email is required"));
    }
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ApiErrorHandler(404, "User not found"));
    }
    const resetToken = user.generateResetPasswordToken();
    await user.save({ validateModifiedOnly: true });
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const message = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .code-box {
              background-color: #e9ecef;
              padding: 15px;
              border-radius: 5px;
              font-family: monospace;
              font-size: 18px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Reset Your Password</h2>
            <p>Hi ${user.fullName},</p>
            <p>You requested a password reset. Click the button below to reset your password:</p>

            <div class="code-box">
              <a href="${resetPasswordUrl}" style="background-color:#337ab7; color:white; padding:15px; text-decoration:none; border-radius:5px;">Reset Password</a>
            </div>

            <p>If you didn't request this, please ignore this email.</p>

            <p>Thanks,<br>The Team</p>

            <div class="footer">
              &copy; ${new Date().getFullYear()} Your Company. All rights reserved.
            </div>
          </div>
        </body>
      </html>`;
    await sendMail({ message, email, subject: "reset your password" });
    return res.status(200).json({
      success: true,
      message:
        "An email has been sent to your registered email address with instructions to reset your password.",
    });
  } catch (error) {
    next(new ApiErrorHandler(500, error));
  }
});

//*  reset password
const resetPassword = asyncErrorHandler(async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
      return next(new ApiErrorHandler(400, "All fields are required"));
    }
    if (password !== confirmPassword) {
      return next(new ApiErrorHandler(400, "password dose not match"));
    }

    // 🔐 Hash token before comparing
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpire: { $gt: Date.now() },
    }).select("+password");
    if (!user) {
      return next(new ApiErrorHandler(404, "Invalid or expired token"));
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpire = null;

    await user.save({ validateModifiedOnly: true });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(new ApiErrorHandler(500, error));
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
    res.status(401).json({ success: false, message: "Email is required" });
  }
  const existEmail = await Subscribe.find({ email });
  if (existEmail) {
    return next(new ApiErrorHandler(403, "email already registered"));
  }
  await Subscribe.insertOne({ email });
  return res.status(200).json({
    success: true,
    message: "Thanks for subscribing.",
  });
});

//! **************************** solve paper code start here ******************************************
import Tesseract from "tesseract.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function extractTextFromImage(imageUrl) {
  const {
    data: { text },
  } = await Tesseract.recognize(imageUrl, "eng");
  return text;
}
async function extractTextFromImageForOpenRouter(imageUrl) {
  const {
    data: { text },
  } = await Tesseract.recognize(imageUrl, "eng");
  return text
    .replace(/\n{2,}/g, "\n")
    .replace(/[^\x20-\x7E\n]/g, "")
    .slice(0, 12000);
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getQuestionsAndAnswers(ocrText) {
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-lite-latest", // free text model
  });

  const prompt1 = `You are an assistant for processing and solving exam question papers.

  Input:
  The following text is extracted using OCR from a question paper:
  ${ocrText}
  Your Tasks:
  1. Ignore headers, paper codes, instructions, etc.
  2. Extract only the questions.
  3. Solve each question step by step.
  4. Assign each question:
      - a sequential question number
      - a unique ID (format: "q_<random_string>")
  5. Solve each question step by step.
  6. Return the final response strictly in the following JSON format:

  {
    "questions": [
      {
        "question_number": <number>,
        "question_id": "q_<unique_id>",
        "question_text": "<cleaned_question_text>",
        "solution": "<step_by_step_solution>"
      } 
    ]
  }

  Rules:
  - Output must be valid JSON.
  - Do not include any text outside the JSON.
  - Ensure unique_id is random for each question.
  - Ensure question_text is clean and complete.
  - Solutions must be correct, clear, and step-by-step.
  `;

  const result = await model.generateContent([{ text: prompt1 }]);
  return result.response.text();
}
const solvePaper = asyncErrorHandler(async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "Image URL required" });

    const ocrText = await extractTextFromImage(imageUrl);
    const solution = await getQuestionsAndAnswers(ocrText);

    res.status(200).json({ solution, message: "paper solved successfully" });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Something went wrong", details: err.message });
  }
});

//! **************************** solve paper with open router api start here ******************************************

const promptForOpenRouter = `
You are an AI system for processing and solving exam question papers.

Input:
The following text is extracted using OCR from a scanned question paper:

{{OCR_TEXT}}

Your Tasks:

1. Ignore headers, roll numbers, page numbers, paper codes, instructions, footers, watermarks, and decorative text.
2. Extract only valid exam questions.
3. Clean and rewrite each question clearly and completely.
4. Solve each question step by step.
5. Assign each question:
   - A sequential question_number starting from 1
   - A unique random ID in the format "q_<random_string>"

6. For each question, suggest 3 to 5 highly relevant YouTube learning videos that would help a student understand or solve the question.

Each video must include:
- title
- channel
- search_query (so it can be searched on YouTube)

7. Return the final output strictly in the following JSON format:

{
  "questions": [
    {
      "question_number": 1,
      "question_id": "q_x8d9s3",
      "question_text": "Cleaned full question here",
      "solution": "Step-by-step solution here",
      "video_suggestions": [
        {
          "title": "Video title",
          "channel": "Channel name",
          "search_query": "Exact search query to find this video on YouTube"
        }
      ]
    }
  ]
}

Rules:
- Output must be valid JSON only.
- Do NOT include any text outside the JSON.
- Every question must have 3–5 video suggestions.
- Video suggestions must be realistic and educational (Khan Academy, Physics Wallah, Unacademy, Organic Chemistry Tutor, etc).
- Solutions must be accurate, detailed, and step-by-step.
- Unique IDs must be different for every question.
`;

const solvePaperWithOpenRouter = asyncErrorHandler(async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    const ocrText = await extractTextFromImageForOpenRouter(imageUrl);

    if (!ocrText || ocrText.trim().length < 20) {
      return res.status(400).json({ error: "Valid OCR text is required" });
    }

    // Inject OCR text into prompt
    const finalPrompt = promptForOpenRouter.replace("{{OCR_TEXT}}", ocrText);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-4o-mini",
        response_format: { type: "json_object" }, // forces JSON
        messages: [
          {
            role: "system",
            content: finalPrompt,
          },
          {
            role: "user",
            content: "Process this OCR exam text and follow all rules exactly.",
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiText = response.data.choices[0].message.content;
    // Safely parse JSON
    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (err) {
      console.error("Invalid JSON from AI:", aiText);
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: aiText,
      });
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error(error.response?.data || error);
    return next(new ApiErrorHandler(500, "OpenRouter OCR processing failed"));
  }
});

export {
  registerUser,
  verifyOTP,
  login,
  forgetPassword,
  resetPassword,
  getUser,
  getLetestPaper,
  solvePaper,
  getAllPaper,
  getPaperByYear,
  solvePaperWithOpenRouter,
  subscribe,
};

//     paperName: 'COMPUTER FUNDAMENTAL', okk
//     year: 2025,
//     description: 'this is mca exam paper',
//     department: 'CS&IT',
//     course: 'MCA',
//     fileUrl: 'http://res.cloudinary.com/dx1n4sl3c/image/upload/v1759259330/l1nf1zpf7yesnmckjpgw.jpg',
//     collegeName: 'motherhood'
