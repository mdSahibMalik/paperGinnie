import dotenv from 'dotenv';
dotenv.config();
import mongoose from "mongoose";
 const connection = () => {
  const connect =  mongoose.connect(process.env.MONGODB_LOCAL_URI,)
  connect.then((conn)=>{
    console.log(`MONGODB CONNECT SUCCESSFULLY AT :- ${conn.connection.host}`);
  })
  .catch((err) =>{
    console.log(err,'MONOGO CONNECTION FAILED');
  })
};

const localConnection = () =>{
  try {
    const connect = mongoose.connect('mongodb://localhost:27017/paperGinnie')
  } catch (error) {
    console.log('something went wrong wiht database ');
  }

}

export {connection, localConnection};