import dotenv from 'dotenv';
dotenv.config();
import { app } from "./app.js";
import { connection } from './src/database/connection.js';
const PORT = process.env.PORT || 8000;

const startServer = async () => {
  try {
    await connection(); // Wait for MongoDB connection first
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
  }
};

startServer();