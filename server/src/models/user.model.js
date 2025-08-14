import mongoose from "mongoose";
import bcrypt from "bcrypt";

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
      type: String,
      required: [true, "Phone is required"],
       min: [1000000000, "Phone number must be at least 10 digits"],
      max: [999999999999, "Phone number must be at most 12 digits"]
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 character"],
      maxlength: [32, "Password must be at most 32 character"],
      select : false
    },
    type: {
      type: String,
      required: true,
      enum: ["user", "manager", "admin"],
      default: "user",
    },
    isVerified:{
      type: Boolean,
      default : false
    },
    resetPasswordToken:{
      type : String,
    },
    resetPasswordTokenExpire :{
      type : Date
    },
    verificationCode:{
      type:Number
    },
    verificationCodeExpire:{
      type : Date,

    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

//* hash password before save

userSchema.pre("save",async function(next){
  if(!this.isModified("password")){
    next()
  } 
  this.password = await bcrypt.hash(this.password, 10);
});

//* compare password 

userSchema.methods.comparePassword = async function(enteredPassword){
  return await bcrypt.compare(enteredPassword, this.password);
}

export const User = mongoose.model("User", userSchema);
