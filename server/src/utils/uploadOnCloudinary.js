import {v2 as cloudinary} from 'cloudinary';

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const uploadOnCloudinary  = async (localFilePath) =>{
    try {
        const response = await cloudinary.uploader.upload(localFilePath)
        console.log(`file uploaded on cloudinary and new url is : ${response.url}`);
        return response
    } catch (error) {
        console.log(error);
        return null
    }
    
}

export default uploadOnCloudinary;