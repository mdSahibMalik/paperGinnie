import express from "express";
export const app = express();
import cors from "cors";
import cookieParser from "cookie-parser";
import { connection, localConnection } from "./src/database/connection.js";
import userRouter from "./src/routes/user.route.js";
import { ApiErrorHandler } from "./src/utils/ErrorHandler.js";
import collegeRouter from "./src/routes/college.route.js";
// import { errorHandler } from "./src/utils/errorHndlers.js";
import adminRouter  from "./src/routes/admin.route.js";
// import { nodeCronFunction } from "./src/utils/nodeCron.js";
app.get("/", (req, res) => {
  res.status(200).send("server run successfully");
});

app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);
app.use(express.json({limit: '10mb'}));
app.use(cookieParser());

connection();
// localConnection().then(() =>{
//     app.on('error', error =>{
//         console.error('MONGODB CONNECTION FAILED' , error);
//     })
//     app.listen(process.env.PORT,()=>{
//         console.log('MongoDB connection succrssfully');
//     })
// }).catch((err)=> console.log(err));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/college", collegeRouter);
app.use("/api/v1/paper-ginnie-admin", adminRouter);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: err.error,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
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

// nodeCronFunction();
