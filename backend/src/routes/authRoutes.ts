import { Router } from 'express';
import { login, refresh, register } from '../controllers/authController';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();
router.post('/register', register);
router.post('/login', loginLimiter , login);
router.post('/refresh', refresh);


export default router;