import { Router } from 'express';
import { getMe, login, refresh, register } from '../controllers/authController';
import { loginLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/authenticate';

const router = Router();
router.post('/register', register);
router.post('/login', loginLimiter , login);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);


export default router;