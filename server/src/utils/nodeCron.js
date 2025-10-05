import nodeCron from "node-cron";
import { User } from "../models/user.model.js";
import { College } from "../models/college.model.js";

const nodeCronFunction = () => {
  nodeCron.schedule("*/25 * * * * *", async() => {
    const time = new Date(Date.now() - 30 * 60 * 60);
    await User.deleteMany({isVerified:false, createdAt: {$lt: time}});
    await College.deleteMany({isVerified:false, createdAt: {$lt: time}});
    await College.deleteMany({isVerified:true, isVerifiedByAdmin:"rejected"});
  });
};

export { nodeCronFunction };
