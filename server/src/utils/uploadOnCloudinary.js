import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath);
    fs.unlink(localFilePath);
    return response;
  } catch (error) {
    fs.unlink(localFilePath);
    console.log(error);
    return null;
  }
};

export default uploadOnCloudinary;
