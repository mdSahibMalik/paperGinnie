import express from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
// import { connection } from "./src/database/connection.js";
import userRouter from "./src/routes/user.route.js";
import { ApiErrorHandler } from "./src/utils/ErrorHandler.js";
import collegeRouter from "./src/routes/college.route.js";
import adminRouter from "./src/routes/admin.route.js";
import { contactUs } from "./src/controllers/contact.controllers.js";
import { subscribe } from "./src/controllers/user.controllers.js";
import { nodeCronFunction } from "./automation/nodeCron.js";

//! cors policy and code one
app.use(
  cors({
    origin: [ process.env.CLIENT_URL,
    process.env.PROD_CLIENT_URL_NET,process.env.PROD_CLIENT_URL_REN],
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());



app.use("/api/v1/users", userRouter);
app.post("/api/v1/contact", contactUs);
app.post("/api/v1/subscribe", subscribe);
app.use("/api/v1/college", collegeRouter);
app.use("/api/v1/paper-ginnie-admin", adminRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: err.error,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

app.use(ApiErrorHandler);
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ message: "File size should not exceed 10MB." });
  }
});

nodeCronFunction();
