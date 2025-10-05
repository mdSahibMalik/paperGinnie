import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
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
      enum: ["admin"],
      default: "admin",
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordTokenExpire: {
      type: Date,
      select: false,
    },
    createdAt: { type: Date, select: false },
    updatedAt: { type: Date, select: false },
  },
  { timestamps: true }
);

//* hash password before save

adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//* compare password

adminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//* generate jwt token

adminSchema.methods.generateJsonWebToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role, type: "admin" },
    process.env.JWT_SECRET_KEY,
    {
      expiresIn: process.env.JWT_EXPIRE_TIME,
    }
  );
};

export const Admin = mongoose.model("Admin", adminSchema);
