import express from 'express';
export const app = express()
import cors from 'cors';
import cookieParser from 'cookie-parser'
import { connection, localConnection } from './src/database/connection.js';
import userRouter from './src/routes/user.route.js';
import { ApiErrorHandler } from './src/utils/ErrorHandler.js';
app.get('/', (req, res) => {
    res.status(200).send("server run successfully");
})

app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

connection();
// localConnection().then(() =>{
//     app.on('error', error =>{
//         console.error('MONGODB CONNECTION FAILED' , error);
//     })
//     app.listen(process.env.PORT,()=>{
//         console.log('MongoDB connection succrssfully');
//     })
// }).catch((err)=> console.log(err));

app.use('/api/v1/users', userRouter);
app.use(ApiErrorHandler);

