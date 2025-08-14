import { User } from "../models/user.model.js";

const registerUser = async(req,res,)=>{
    const {name, email, password} = req.body;

    const user = new User({
        name,email,password
    });
    const user1 = await user.save();
    console.log(user1);
    res.status(201).json({success:true,user,message:"user created successfully"});
}

const getUser = async(req, res)=>{
    const {email} = req.body;
    const user = await User.findOne({email});
    console.log(user);
    res.status(200).json({
        success:true,
        user,
        message:"user find successfully"
    })
}

export  {getUser, registerUser}