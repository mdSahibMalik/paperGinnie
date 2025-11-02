import mongoose from "mongoose"

const contactSchema = new mongoose.Schema({
    name:{
        type:String,
        requried:true
    },
    email:{
        type:String,
        requried:true
    },
    subject:{
        type:String,
        requried:true
    },
    message:{
        type:String,
        required:true
    }
},{timestamps:true}
);

const Contact = mongoose.model('Contact',contactSchema);
export {Contact}
