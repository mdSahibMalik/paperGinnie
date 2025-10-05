import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    fullName: {
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
      default: "user",
    },
    verificationCode: Number,
    verificationCodeExpire: Date,
    isVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordToken: String,
    resetPasswordTokenExpire: Date
  },
  { timestamps: true }
);

//* hash password before save

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//* compare password

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//* generate jwt token

userSchema.methods.generateJsonWebToken =  function () {
  return jwt.sign({ id: this._id, role : this.role, type:"user" }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE_TIME,
  });
};

userSchema.methods.generateVerificationCode = function () {
  function generateCode() {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigit = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, 0);
    return parseInt(firstDigit + remainingDigit);
  }
  const code = generateCode();
  this.verificationCode = code;
  this.verificationCodeExpire = Date.now() + 5 * 60 * 1000;
  return code;
};

export const User = mongoose.model("User", userSchema);
