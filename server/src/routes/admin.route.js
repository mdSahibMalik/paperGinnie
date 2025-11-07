import express from 'express';
import { isAuthenticate } from '../../middleware/isAuthenticate.js';
import authorizeRoles from '../../middleware/roleMiddleware.js';
import { adminLogin, AllRegisteredColleges, deleteUserByAdmin, verifyUserByAdmin } from '../controllers/admin.contollers.js';
const adminRouter = express.Router();

//! insecure route of admin
adminRouter.post('/login', adminLogin);


//! Secure route admin
adminRouter.get('/registered-colleges',isAuthenticate, authorizeRoles("admin"), AllRegisteredColleges);
// adminRouter.get('/pending-requests',isAuthenticate, authorizeRoles("admin"), getPendingRequests);
adminRouter.post('/verify-users',isAuthenticate, authorizeRoles("admin"), verifyUserByAdmin);
adminRouter.delete('/delete-users/:id',isAuthenticate, authorizeRoles("admin"), deleteUserByAdmin);


export default adminRouter







