import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { users } from '../controllers/userController.js';

const router = Router();

router.get('/users', auth, users);

export default router;
