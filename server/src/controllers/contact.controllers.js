import { Contact } from "../models/contact.model.js";
import { asyncErrorHandler } from "../utils/asyncErrorHandler.js";
import { ApiErrorHandler } from "../utils/ErrorHandler.js";



const contactUs = asyncErrorHandler(async (req, res, next) =>{
    const {name, email, subject, message} = req.body;
    try {
        if(!name || !email || !subject || !message){
            return next(new ApiErrorHandler(403, 'All fields are required.'));
        }
        const existEmail =await Contact.findOne({email});
        if(existEmail){
            return next(new ApiErrorHandler(403, "Your request is pendig we will contact you as soon as possible."));
        }
        
        const contact = {
            name,
            email,
            subject,
            message
        }
        const newUser = await Contact.create(contact);
        newUser.save({validateBeforeSave:true});
        return res.status(201).json({
            success:true,
            message:"Your request sent successfully our team will be contact you as soon as possible"
        })

    } catch (error) {
        next(new ApiErrorHandler(403, 'something wen wrongg'));
    }

})

export {contactUs}