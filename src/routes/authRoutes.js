import { Router } from 'express';
import { loginUser, registerUser, refreshToken, userLogout } from '../controllers/authController.js';
import auth from '../middlewares/auth.js';

const router = Router();

router.post('/auth/login', loginUser);
router.post('/auth/register', registerUser);
router.post('/auth/refresh-token', refreshToken);
router.post('/auth/logout', userLogout);

export default router;
