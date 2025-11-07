import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
const connection = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MONGODB CONNECTED SUCCESSFULLY AT: ${conn.connection.host}`);

  } catch (err) {
    console.error("❌ MONGODB CONNECTION FAILED:", err.message);
    process.exit(1);
  }
};

export { connection };
