import mongoose from "mongoose";

const SubscribeSchema = new mongoose.Schema({
    email:{
        type: String,
        unique:true,
        required:true
    }
});

export const Subscribe = mongoose.model('subscribe',SubscribeSchema);