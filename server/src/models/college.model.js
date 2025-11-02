import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const collegeSchema = new mongoose.Schema(
  {
    collegeName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: Number,
      required: [true, "Phone is required"],
      min: [1000000000, "Phone number must be at least 10 digits"],
      max: [999999999999, "Phone number must be at most 12 digits"],
    },
    password: {
      type: String,
      required: true,
      // minlength: [8, "Password must be at least 8 character"],
      // maxlength: [32, "Password must be at most 32 character"],
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["user", "college", "admin"],
      default: "college",
    },
    emailVerificationCode: { type: Number, select: false },
    emailVerificationCodeExpire: { type: Date, select: false },
    registerToken: { type: String, select: false },
    registerTokenExpire: { type: Date, select: false },
    mobileVerificationCode: { type: Number, select: false },
    mobileVerificationCodeExpire: { type: Date, select: false },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isVerifiedByAdmin: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordTokenExpire: { type: Date, select: false },
    createdAt: { type: Date, select: false },
    updatedAt: { type: Date, select: false },
  },
  { timestamps: true }
);

//* hash password before save

collegeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//* compare password

collegeSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//* generate jwt token

collegeSchema.methods.generateJsonWebToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, type: "college" },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.JWT_EXPIRE_TIME,
    }
  );
};

collegeSchema.methods.generateVerificationCode = function () {
  function generateCode() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigit = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, 0);
    return parseInt(firstDigit + remainingDigit);
  }
  const code = generateCode();
  this.emailVerificationCode = code;
  this.emailVerificationCodeExpire = Date.now() + 5 * 60 * 1000;
  return code;
};

//!  generate verification code for mobile OTP
collegeSchema.methods.generateVerificationCodeForMobile = function () {
  function generateCode() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigit = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, 0);
    return parseInt(firstDigit + remainingDigit);
  }
  const code = generateCode();
  this.mobileVerificationCode = code;
  this.mobileVerificationCodeExpire = Date.now() + 5 * 60 * 1000;
  return code;
};

export const College = mongoose.model("College", collegeSchema);
