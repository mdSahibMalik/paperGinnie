import jwt from "jsonwebtoken";
import { ApiErrorHandler } from "../src/utils/ErrorHandler.js";
import { User } from "../src/models/user.model.js";
import { asyncErrorHandler } from "../src/utils/asyncErrorHandler.js";
import { College } from "../src/models/college.model.js";
import { Admin } from "../src/models/admin.model.js";

export const isAuthenticate = asyncErrorHandler(async (req, res, next) => {
  const token =
    req.cookies.token || req.headers.authorization || req.headers.Authorization;
  if (!token) {
    next(new ApiErrorHandler(403, "unAuthorized user"));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    let user;
    if(decoded.type === 'college'){
      user = await College.findById({ _id: decoded.id });
    }else if(decoded.type === 'user'){
      user = await User.findById({_id: decoded.id})
    }else if(decoded.type === 'admin'){
      user = await Admin.findById({_id: decoded.id})
    }
     if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user._id,
      role: user.role,
    };
    
    next();
  } catch (error) {
    next(new ApiErrorHandler(401, "Invalid request"));
  }
});
